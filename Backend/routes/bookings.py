# routes/booking_routes.py - Updated with Booked status and check-in/out times
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks
from models.booking import FrontendBookingRequest, BookingResponse, AdminBookingRequest
from routes.notifications import trigger_booking_created, trigger_booking_cancelled
from supabase_client import supabase
from datetime import datetime, date, timedelta, timezone, time
from typing import List
import logging
import asyncio
from utils.cache_helper import CacheManager, get_billing_settings_cached
from routes.availability_routes import (
       check_room_availability,
       get_available_rooms_optimized
   )

router = APIRouter()
logging.basicConfig(level=logging.INFO)

# ============================================
# CONSTANTS
# ============================================

DEFAULT_CHECK_IN_TIME = time(12, 0)  # 12:00 PM (noon)
DEFAULT_CHECK_OUT_TIME = time(12, 0)  # 12:00 PM (noon)

CHECK_IN_TIME_OPTIONS = [
    "09:00",  # 9 AM
    "10:00",  # 10 AM
    "11:00",  # 11 AM
    "12:00",  # 12 PM (noon) - default
    "13:00",  # 1 PM
    "14:00",  # 2 PM
    "15:00",  # 3 PM
]

# ============================================
# TIMEZONE UTILITIES
# ============================================

def utc_to_pkt(utc_dt: datetime) -> datetime:
    """Convert UTC datetime to PKT (UTC+5)"""
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    else:
        utc_dt = utc_dt.astimezone(timezone.utc)
    return utc_dt + timedelta(hours=5)

def get_pkt_today() -> date:
    """Get current date in PKT timezone"""
    return utc_to_pkt(datetime.utcnow()).date()

def get_pkt_now() -> datetime:
    """Get current datetime in PKT timezone"""
    return utc_to_pkt(datetime.utcnow())

# ============================================
# HELPER: BOOKING ID GENERATION
# ============================================

async def generate_next_booking_id() -> str:
    """Generate next sequential booking ID (e.g., BK001, BK002)"""
    result = await asyncio.to_thread(
        lambda: supabase.table("bookings")
        .select("booking_id")
        .order("id", desc=True)
        .limit(1)
        .execute()
    )
    
    if result.data:
        last_id = int(result.data[0]["booking_id"][2:])
        return f"BK{str(last_id + 1).zfill(3)}"
    return "BK001"


# ============================================
# HELPER: UPDATE ROOM STATUS BASED ON DATE
# ============================================

async def update_room_status_based_on_date(
    room_number: str, 
    check_in_date: date, 
    booking_status: str,
    context: str = "booking_api"
):
    """
    Update room status based on check-in date:
    - If check-in is TODAY (PKT) AND booking is confirmed: mark as "Occupied"
    - If check-in is FUTURE AND booking is confirmed/pending: mark as "Booked"
    - Otherwise: no change
    """
    pkt_today = get_pkt_today()
    
    # Only update for confirmed or pending bookings
    if booking_status not in ["confirmed", "pending"]:
        logging.info(f"🚫 Booking status is {booking_status} - no room status update")
        return
    
    if check_in_date == pkt_today:
        # Check-in is today - mark as Occupied (for confirmed bookings only)
        if booking_status == "confirmed":
            new_status = "Occupied"
            logging.info(f"🏨 Check-in is TODAY ({pkt_today}) - marking room {room_number} as {new_status}")
            
            await asyncio.to_thread(
                lambda: supabase.table("rooms")
                .update({"status": new_status})
                .eq("room_number", room_number)
                .execute()
            )
        else:
            logging.info(f"🕒 Check-in is TODAY but status is {booking_status} - no update")
    
    elif check_in_date > pkt_today:
        # Future booking - mark as Booked
        new_status = "Booked"
        logging.info(f"📅 Check-in is FUTURE ({check_in_date}) - marking room {room_number} as {new_status}")
        
        await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .update({"status": new_status})
            .eq("room_number", room_number)
            .execute()
        )
    else:
        logging.info(f"🕒 Check-in is in the PAST ({check_in_date}) - no room status update")

# ============================================
# ENDPOINT: CUSTOMER BOOKING CREATION
# ============================================

@router.post("/bookings", response_model=BookingResponse)
async def create_customer_booking(
    booking_request: FrontendBookingRequest,
    background_tasks: BackgroundTasks
):
    """
    Create a customer booking (status: pending).
    Room status updates based on check-in date:
    - Future bookings: room marked as "Booked"
    - Today's bookings: room stays "Available" until payment confirmation
    """
    logging.info("📥 Customer booking request received")
    inserted_booking_id = None
    room_number = None
    
    try:
        # Parse dates
        check_in_date = datetime.fromisoformat(booking_request.check_in).date()
        check_out_date = datetime.fromisoformat(booking_request.check_out).date()
        
        # Parse check-in time (default to noon if not provided)
        check_in_time_str = getattr(booking_request, 'check_in_time', None)
        if check_in_time_str:
            check_in_time_obj = datetime.strptime(check_in_time_str, "%H:%M").time()
        else:
            check_in_time_obj = DEFAULT_CHECK_IN_TIME
        
        # Parallel fetch: room type and billing settings
        room_type_task = asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .eq("id", booking_request.room_type_id)
            .execute()
        )
        billing_settings_task = get_billing_settings_cached()
        
        room_type_result, _ = await asyncio.gather(room_type_task, billing_settings_task)
        
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        
        # Get available rooms (optimized)
        available_rooms = await get_available_rooms_optimized(
            room_type["id"], check_in_date, check_out_date
        )
        
        if not available_rooms:
            raise HTTPException(
                status_code=400,
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}"
            )
        
        # Select first available room
        selected_room = available_rooms[0]
        room_number = selected_room["room_number"]
        
        # Double-check availability
        is_available = await check_room_availability(room_number, check_in_date, check_out_date)
        if not is_available:
            raise HTTPException(
                status_code=400,
                detail=f"Room {room_number} just became unavailable. Please try again."
            )
        
        # Generate booking ID
        booking_id = await generate_next_booking_id()
        inserted_booking_id = booking_id
        
        # Calculate total
        nights = (check_out_date - check_in_date).days or 1
        calculated_total = nights * room_type["base_price"]
        total_amount = booking_request.total_amount if abs(booking_request.total_amount - calculated_total) <= calculated_total * 0.1 else calculated_total
        
        # Split guest name
        name_parts = booking_request.guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Insert booking with check-in time
        booking_data = {
            "booking_id": booking_id,
            "check_in": booking_request.check_in,
            "check_out": booking_request.check_out,
            "check_in_time": check_in_time_obj.strftime("%H:%M"),
            "check_out_time": DEFAULT_CHECK_OUT_TIME.strftime("%H:%M"),
            "guests": getattr(booking_request, 'guests', 2) or 2,
            "room_number": room_number,
            "room_type": selected_room["room_type"] or room_type["name"],
            "first_name": first_name,
            "last_name": last_name,
            "email": booking_request.guest_email,
            "phone": int(booking_request.guest_phone) if booking_request.guest_phone and booking_request.guest_phone.isdigit() else 0,
            "status": "pending",
            "source": "Direct",
            "user_id": booking_request.user_id,
            "special_requests": getattr(booking_request, 'special_requests', ''),
            "is_updated": False,
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        await asyncio.to_thread(
            lambda: supabase.table("bookings").insert(booking_data).execute()
        )
        
        logging.info(f"✅ Customer booking {booking_id} created (status: pending)")
        
        # 🔥 UPDATE ROOM STATUS - For future bookings, mark as "Booked"
        # For today's booking, keep as Available until payment
        await update_room_status_based_on_date(room_number, check_in_date, "pending", "customer_booking_api")
        
        # Trigger notification (non-blocking)
        asyncio.create_task(
            trigger_booking_created(
                booking_id=booking_id,
                guest_name=f"{first_name} {last_name}",
                room_number=room_number,
                status="pending"
            )
        )
        
        # Cache invalidation (non-blocking)
        asyncio.create_task(
            asyncio.to_thread(
                lambda: CacheManager.invalidate_booking_related_cache(
                    room_number=room_number,
                    user_id=booking_request.user_id
                )
            )
        )
        
        # Schedule cleanup (7 minutes)
        from routes.notifications import call_edge_function_for_cleanup
        background_tasks.add_task(call_edge_function_for_cleanup, booking_id=None, delay_minutes=7)
        
        return BookingResponse(
            success=True,
            booking_id=booking_id,
            room_number=room_number,
            total_amount=total_amount,
            message="Booking created successfully. Please complete payment within 7 minutes.",
            status="pending"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error creating customer booking: {e}")
        
        # Rollback on error
        if inserted_booking_id:
            try:
                await asyncio.to_thread(
                    lambda: supabase.table("bookings")
                    .delete()
                    .eq("booking_id", inserted_booking_id)
                    .execute()
                )
                logging.info(f"🧹 Rolled back booking {inserted_booking_id}")
                
                # Reset room status if it was changed
                if room_number:
                    await asyncio.to_thread(
                        lambda: supabase.table("rooms")
                        .update({"status": "Available"})
                        .eq("room_number", room_number)
                        .execute()
                    )
            except Exception as rollback_error:
                logging.error(f"Rollback error: {rollback_error}")
        
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

# ============================================
# ENDPOINT: ADMIN BOOKING CREATION
# ============================================

@router.post("/admin/bookings", response_model=BookingResponse)
async def create_admin_booking(booking_data: AdminBookingRequest):
    """
    Create an admin booking (status: confirmed by default).
    Creates billing record immediately.
    Room status updates based on check-in date and booking status:
    - Future confirmed bookings: room marked as "Booked"
    - Today's confirmed bookings: room marked as "Occupied"
    """
    logging.info("📥 Admin booking request received")
    inserted_booking_id = None
    inserted_billing_id = None
    room_number = None
    
    try:
        # Parse dates
        check_in_date = datetime.fromisoformat(booking_data.check_in).date()
        check_out_date = datetime.fromisoformat(booking_data.check_out).date()
        
        pkt_today = get_pkt_today()
        is_today_booking = (check_in_date == pkt_today)
        
        # Parse check-in time
        # For walk-in/today bookings, allow custom check-in time
        check_in_time_str = getattr(booking_data, 'check_in_time', None)
        if check_in_time_str:
            check_in_time_obj = datetime.strptime(check_in_time_str, "%H:%M").time()
        else:
            # Use current time for today's bookings, default for future
            if is_today_booking:
                pkt_now = get_pkt_now()
                check_in_time_obj = pkt_now.time()
            else:
                check_in_time_obj = DEFAULT_CHECK_IN_TIME
        
        # Parallel fetch: room type and billing settings
        room_type_task = asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .eq("id", booking_data.room_type_id)
            .execute()
        )
        billing_settings_task = get_billing_settings_cached()
        
        room_type_result, billing_settings = await asyncio.gather(room_type_task, billing_settings_task)
        
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        
        # Get available rooms
        available_rooms = await get_available_rooms_optimized(
            room_type["id"], check_in_date, check_out_date
        )
        
        if not available_rooms:
            raise HTTPException(
                status_code=400,
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}"
            )
        
        # Select room (admin can specify room_number)
        if booking_data.room_number:
            selected_room = next(
                (r for r in available_rooms if r["room_number"] == booking_data.room_number),
                None
            )
            if not selected_room:
                raise HTTPException(
                    status_code=400,
                    detail=f"Room {booking_data.room_number} is not available for selected dates"
                )
        else:
            selected_room = available_rooms[0]
        
        room_number = selected_room["room_number"]
        
        # Generate booking ID
        booking_id = await generate_next_booking_id()
        inserted_booking_id = booking_id
        
        # Split guest name
        name_parts = booking_data.guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Calculate billing
        nights = (check_out_date - check_in_date).days or 1
        base_amount = room_type["base_price"] * nights
        discount_amount = base_amount * (billing_settings["discount"] / 100)
        vat_amount = (base_amount - discount_amount) * (billing_settings["vat"] / 100)
        final_total = booking_data.total_amount if booking_data.total_amount > 0 else (base_amount - discount_amount + vat_amount)
        
        # Prepare booking data
        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": booking_data.check_in,
            "check_out": booking_data.check_out,
            "check_in_time": check_in_time_obj.strftime("%H:%M"),
            "check_out_time": DEFAULT_CHECK_OUT_TIME.strftime("%H:%M"),
            "guests": booking_data.guests or 2,
            "room_number": room_number,
            "room_type": selected_room["room_type"],
            "first_name": first_name,
            "last_name": last_name,
            "email": booking_data.guest_email,
            "phone": int(booking_data.guest_phone) if booking_data.guest_phone and booking_data.guest_phone.isdigit() else 0,
            "status": booking_data.status,
            "source": "Admin",
            "user_id": booking_data.user_id,
            "is_updated": False,
            "special_requests": booking_data.special_requests or "",
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Prepare billing data
        billing_insert_data = {
            "booking_id": booking_id,
            "room_price": room_type["base_price"],
            "discount": billing_settings["discount"],
            "vat": billing_settings["vat"],
            "total_amount": final_total,
            "payment_method": booking_data.payment_method or "Admin",
            "payment_status": booking_data.payment_status or "Pending",
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        # Insert booking first
        booking_result = await asyncio.to_thread(
            lambda: supabase.table("bookings").insert(booking_insert_data).execute()
        )
        
        # Then insert billing (this ensures booking exists for foreign key)
        try:
            billing_result = await asyncio.to_thread(
                lambda: supabase.table("billing").insert(billing_insert_data).execute()
            )
            if billing_result.data:
                inserted_billing_id = billing_result.data[0]["id"]
        except Exception as billing_error:
            # If billing fails, rollback booking
            logging.error(f"❌ Billing creation failed: {billing_error}")
            await asyncio.to_thread(
                lambda: supabase.table("bookings")
                .delete()
                .eq("booking_id", booking_id)
                .execute()
            )
            raise HTTPException(status_code=500, detail=f"Billing creation failed: {str(billing_error)}")
        
        logging.info(f"✅ Admin booking {booking_id} created (status: {booking_data.status})")
        
        # 🔥 UPDATE ROOM STATUS based on check-in date and booking status
        await update_room_status_based_on_date(room_number, check_in_date, booking_data.status, "admin_booking_api")
        
        # Trigger notification (non-blocking)
        asyncio.create_task(
            trigger_booking_created(
                booking_id=booking_id,
                guest_name=f"{first_name} {last_name}",
                room_number=room_number,
                status=booking_data.status
            )
        )
        
        # Cache invalidation (non-blocking)
        asyncio.create_task(
            asyncio.to_thread(
                lambda: CacheManager.invalidate_booking_related_cache(
                    room_number=room_number,
                    user_id=booking_data.user_id
                )
            )
        )
        
        return BookingResponse(
            success=True,
            booking_id=booking_id,
            room_number=room_number,
            total_amount=final_total,
            message="Admin booking and billing created successfully",
            status=booking_data.status
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error creating admin booking: {e}")
        
        # Comprehensive rollback
        if inserted_booking_id:
            try:
                # Delete billing first (if created)
                if inserted_billing_id:
                    await asyncio.to_thread(
                        lambda: supabase.table("billing")
                        .delete()
                        .eq("booking_id", inserted_booking_id)
                        .execute()
                    )
                
                # Then delete booking
                await asyncio.to_thread(
                    lambda: supabase.table("bookings")
                    .delete()
                    .eq("booking_id", inserted_booking_id)
                    .execute()
                )
                
                # Reset room status
                if room_number:
                    await asyncio.to_thread(
                        lambda: supabase.table("rooms")
                        .update({"status": "Available"})
                        .eq("room_number", room_number)
                        .execute()
                    )
                
                logging.info(f"🧹 Rolled back admin booking {inserted_booking_id}")
            except Exception as rollback_error:
                logging.error(f"Rollback error: {rollback_error}")
        
        raise HTTPException(status_code=500, detail=f"Admin booking failed: {str(e)}")


@router.get("/users")
def search_users(search: str = Query(..., min_length=2)):
    """Search users by email or phone number"""
    try:
        logging.info(f"🔍 Searching users with term: '{search}'")
        
        search_clean = search.strip()
        
        result = supabase.table("users") \
            .select("id, name, email, phone") \
            .or_(f"email.ilike.%{search_clean}%,phone.ilike.%{search_clean}%") \
            .limit(10) \
            .execute()
        
        transformed_users = []
        for user in result.data:
            name_parts = user["name"].split(" ", 1) if user["name"] else ["", ""]
            first_name = name_parts[0] if len(name_parts) > 0 else ""
            last_name = name_parts[1] if len(name_parts) > 1 else ""
            
            transformed_users.append({
                "id": user["id"],
                "first_name": first_name,
                "last_name": last_name,
                "email": user["email"],
                "phone": user["phone"] or ""
            })
        
        logging.info(f"✅ Found {len(transformed_users)} users")
        return {"users": transformed_users}
        
    except Exception as e:
        logging.error(f"❌ Error searching users: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"User search failed: {str(e)}")

@router.post("/bookings/cleanup")
async def trigger_booking_cleanup(background_tasks: BackgroundTasks):
    """Manually trigger booking cleanup (for admin/testing purposes)"""
    try:
        from routes.notifications import call_edge_function_for_cleanup
        background_tasks.add_task(call_edge_function_for_cleanup, booking_id=None, delay_minutes=0)
        return {
            "success": True,
            "message": "Booking cleanup triggered"
        }
    except Exception as e:
        logging.error(f"❌ Error triggering cleanup: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger cleanup: {str(e)}")


@router.get("/debug/rooms-and-types")
def debug_rooms_and_types():
    """Debug endpoint to check room types and rooms matching"""
    try:
        room_types = supabase.table("room_types").select("*").execute()
        rooms = supabase.table("rooms").select("*").execute()
        
        availability_info = []
        for rt in room_types.data:
            available_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"] and r.get("status") == "Available"]
            booked_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"] and r.get("status") == "Booked"]
            occupied_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"] and r.get("status") == "Occupied"]
            total_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"]]
            
            availability_info.append({
                "room_type": rt["name"],
                "room_type_id": rt["id"],
                "total_rooms": len(total_rooms),
                "available_rooms": len(available_rooms),
                "booked_rooms": len(booked_rooms),
                "occupied_rooms": len(occupied_rooms),
                "available_room_numbers": [r["room_number"] for r in available_rooms],
                "booked_room_numbers": [r["room_number"] for r in booked_rooms],
                "occupied_room_numbers": [r["room_number"] for r in occupied_rooms]
            })
        
        return {
            "room_types": room_types.data,
            "rooms": rooms.data,
            "availability_summary": availability_info,
            "check_in_time_options": CHECK_IN_TIME_OPTIONS,
            "default_check_in_time": DEFAULT_CHECK_IN_TIME.strftime("%H:%M"),
            "default_check_out_time": DEFAULT_CHECK_OUT_TIME.strftime("%H:%M")
        }
    except Exception as e:
        logging.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/dashboard")
def get_user_dashboard(user_id: int):
    """Get simple user dashboard data"""
    cache_key = CacheManager.USER_DASHBOARD_KEY.format(user_id=user_id)
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        bookings_result = supabase.table("user_bookings_simple") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        bookings = bookings_result.data or []
        
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b["status"] == "confirmed"])
        
        total_spent = sum(
            float(b["total_amount"] or 0) 
            for b in bookings 
            if b["status"] in ["confirmed", "completed"]
        )
        
        result = {
            "user_id": user_id,
            "statistics": {
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "total_spent": total_spent
            },
            "bookings": bookings
        }
        
        CacheManager.set_cache(cache_key, result, CacheManager.USER_DASHBOARD_TTL)
        
        return result
        
    except Exception as e:
        logging.error(f"Error fetching user dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/email/{email}/dashboard")
def get_user_dashboard_by_email(email: str):
    """Get simple user dashboard data by email"""
    cache_key = f"user_dashboard:email:{email}"
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data

    try:
        user_result = supabase.table("users") \
            .select("id, name, email") \
            .eq("email", email) \
            .execute()
        
        if user_result.data:
            user_id = user_result.data[0]["id"]
            return get_user_dashboard(user_id)
        else:
            bookings_result = supabase.table("user_bookings_simple") \
                .select("*") \
                .eq("email", email) \
                .execute()
            
            bookings = bookings_result.data or []
            
            total_bookings = len(bookings)
            confirmed_bookings = len([b for b in bookings if b["status"] == "confirmed"])
            
            total_spent = sum(
                float(b["total_amount"] or 0) 
                for b in bookings 
                if b["status"] in ["confirmed", "completed"]
            )
            
            result = {
                "user_email": email,
                "user_id": None,
                "statistics": {
                    "total_bookings": total_bookings,
                    "confirmed_bookings": confirmed_bookings,
                    "total_spent": total_spent
                },
                "bookings": bookings
            }
            
            CacheManager.set_cache(cache_key, result, CacheManager.USER_DASHBOARD_TTL)
            
            return result
            
    except Exception as e:
        logging.error(f"Error fetching user dashboard by email: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str):
    """Cancel a booking and update room status accordingly"""
    try:
        booking_result = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("room_number, status, check_in, first_name, last_name, email")
            .eq("booking_id", booking_id)
            .single()
            .execute()
        )

        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")

        booking = booking_result.data
        room_number = booking["room_number"]
        check_in_date = date.fromisoformat(booking["check_in"]) if isinstance(booking["check_in"], str) else booking["check_in"]

        logging.info(f"📌 Cancelling booking {booking_id} for room {room_number}")

        # Update booking: set cancelled flags
        await asyncio.to_thread(
            lambda: supabase.table("bookings").update({
                "status": "cancelled",
                "is_cancelled": True,
                "updated_at": datetime.utcnow().isoformat()
            }).eq("booking_id", booking_id).execute()
        )

        logging.info(f"✅ Booking {booking_id} marked as cancelled")

        # Update billing: mark as cancelled
        await asyncio.to_thread(
            lambda: supabase.table("billing").update({
                "is_cancelled": True,
                "cancelled_at": datetime.utcnow().isoformat()
            }).eq("booking_id", booking_id).execute()
        )

        logging.info(f"💳 Billing for {booking_id} marked as cancelled")

        # Trigger cancellation notification
        guest_name = f"{booking.get('first_name', '')} {booking.get('last_name', '')}".strip()
        if not guest_name:
            guest_name = booking.get('email', 'Guest')
        
        asyncio.create_task(
            trigger_booking_cancelled(
                booking_id=booking_id,
                guest_name=guest_name
            )
        )

        # Check for other active bookings for the same room
        other_future_bookings = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("booking_id, check_in, status")
            .eq("room_number", room_number)
            .neq("booking_id", booking_id)
            .eq("is_cancelled", False)
            .gte("check_in", check_in_date.isoformat())
            .execute()
        )

        logging.info(f"🔍 Found {len(other_future_bookings.data)} future bookings for room {room_number}")

        # Determine new room status
        pkt_today = get_pkt_today()
        new_room_status = "Available"
        
        for future_booking in other_future_bookings.data:
            future_check_in = date.fromisoformat(future_booking["check_in"]) if isinstance(future_booking["check_in"], str) else future_booking["check_in"]
            future_status = future_booking.get("status", "")
            
            if future_check_in == pkt_today and future_status in ["confirmed", "pending"]:
                # Another booking starts today
                new_room_status = "Occupied" if future_status == "confirmed" else "Booked"
                break
            elif future_check_in > pkt_today and future_status in ["confirmed", "pending"]:
                # Future booking exists
                new_room_status = "Booked"
                break

        # Update room status
        await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .update({"status": new_room_status})
            .eq("room_number", room_number)
            .execute()
        )
        logging.info(f"🏨 Room {room_number} marked as {new_room_status}")

        # Cache invalidation
        asyncio.create_task(
            asyncio.to_thread(
                lambda: CacheManager.invalidate_booking_related_cache(room_number=room_number)
            )
        )
        logging.info(f"🗑️ Cache invalidated after booking cancellation: {booking_id}")

        return {
            "success": True,
            "message": f"Booking {booking_id} cancelled. Room status updated to {new_room_status}."
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error cancelling booking: {e}")
        raise HTTPException(status_code=500, detail=f"Cancellation failed: {str(e)}")

@router.delete("/bookings/{booking_id}/rollback")
async def rollback_booking_if_unconfirmed(booking_id: str):
    """Delete booking + reset room if billing wasn't confirmed"""
    try:
        # Check billing status
        result = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("*")
            .eq("booking_id", booking_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Booking not found")

        booking = result.data[0]
        if booking.get("billing_confirmed"):
            return {"message": "Billing already confirmed. No rollback."}

        room_number = booking["room_number"]
        check_in_date = date.fromisoformat(booking["check_in"]) if isinstance(booking["check_in"], str) else booking["check_in"]

        # Check for other active bookings for this room
        other_bookings = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("booking_id, check_in, status")
            .eq("room_number", room_number)
            .neq("booking_id", booking_id)
            .eq("is_cancelled", False)
            .execute()
        )

        # Determine new room status after rollback
        pkt_today = get_pkt_today()
        new_room_status = "Available"
        
        for other_booking in other_bookings.data:
            other_check_in = date.fromisoformat(other_booking["check_in"]) if isinstance(other_booking["check_in"], str) else other_booking["check_in"]
            other_status = other_booking.get("status", "")
            
            if other_check_in == pkt_today and other_status in ["confirmed", "pending"]:
                new_room_status = "Occupied" if other_status == "confirmed" else "Booked"
                break
            elif other_check_in > pkt_today and other_status in ["confirmed", "pending"]:
                new_room_status = "Booked"
                break

        # Update room status
        await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .update({"status": new_room_status})
            .eq("room_number", room_number)
            .execute()
        )
        logging.info(f"🏨 Room {room_number} marked as {new_room_status} after rollback")

        # Delete booking
        await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .delete()
            .eq("booking_id", booking_id)
            .execute()
        )

        # Cache invalidation
        asyncio.create_task(
            asyncio.to_thread(
                lambda: CacheManager.invalidate_booking_related_cache(room_number=room_number)
            )
        )

        return {"message": "Booking rolled back successfully", "room_status": new_room_status}
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Rollback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINT: GET CHECK-IN TIME OPTIONS
# ============================================

@router.get("/check-in-time-options")
def get_check_in_time_options():
    """Get available check-in time options"""
    return {
        "options": CHECK_IN_TIME_OPTIONS,
        "default": DEFAULT_CHECK_IN_TIME.strftime("%H:%M"),
        "check_out_time": DEFAULT_CHECK_OUT_TIME.strftime("%H:%M")
    }