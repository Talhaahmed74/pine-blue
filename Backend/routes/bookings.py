from fastapi import APIRouter, HTTPException, Query
from models.booking import Booking, BookingUpdate, FrontendBookingRequest, BookingResponse, BookingWithUser
from models.booking_request import BookingRequest
from models.billing import Billing, BillingUpdate
from supabase_client import supabase
from datetime import datetime, date
from typing import Optional, List
import time
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

def generate_booking_id(last_id: int) -> str:
    return f"BK{str(last_id + 1).zfill(3)}"

def check_room_availability(room_number: str, check_in: date, check_out: date) -> bool:
    """Check if a room is available for the given date range"""
    try:
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .eq("room_number", room_number) \
            .neq("status", "cancelled") \
            .execute()

        for booking in overlapping_result.data:
            b_check_in = datetime.fromisoformat(booking["check_in"]).date()
            b_check_out = datetime.fromisoformat(booking["check_out"]).date()
            
            if not (b_check_out <= check_in or b_check_in >= check_out):
                return False
        return True
    except Exception as e:
        logging.error(f"Error checking room availability: {e}")
        return False

def check_guest_capacity_by_name(room_type_name: str, guests: int) -> bool:
    """Check if the number of guests doesn't exceed room capacity using room type name"""
    try:
        room_type_result = supabase.table("room_types").select("max_adults", "max_children").eq("name", room_type_name).execute()
        if not room_type_result.data:
            logging.warning(f"Room type '{room_type_name}' not found")
            return False
            
        room_type = room_type_result.data[0]
        
        # Handle cases where max_adults or max_children might be None
        max_adults = room_type.get("max_adults") or 2
        max_children = room_type.get("max_children") or 1
        max_capacity = max_adults + max_children
        
        return guests <= max_capacity
    except Exception as e:
        logging.error(f"Error checking guest capacity: {e}")
        return False

def get_available_rooms_for_type_id(room_type_id: int, check_in: date, check_out: date) -> List[dict]:
    """Get all available rooms for a specific room type ID and date range"""
    try:
        # Get room type name first
        room_type_result = supabase.table("room_types").select("name").eq("id", room_type_id).execute()
        if not room_type_result.data:
            logging.error(f"Room type ID {room_type_id} not found")
            return []
        
        room_type_name = room_type_result.data[0]["name"]
        
        # Get all rooms of this type that are Available using room_type_id from rooms table
        all_rooms_result = supabase.table("rooms") \
            .select("room_number, room_type, room_type_id, status") \
            .eq("room_type_id", room_type_id) \
            .eq("status", "Available") \
            .execute()
            
        available_rooms = []
        for room in all_rooms_result.data:
            if check_room_availability(room["room_number"], check_in, check_out):
                available_rooms.append(room)
                
        return available_rooms
    except Exception as e:
        logging.error(f"Error getting available rooms: {e}")
        return []

def get_available_rooms_for_type(room_type_name: str, check_in: date, check_out: date) -> List[dict]:
    """Get all available rooms for a specific room type name and date range"""
    try:
        # Get all rooms of this type that are Available
        all_rooms_result = supabase.table("rooms") \
            .select("room_number, room_type, room_type_id, status") \
            .eq("room_type", room_type_name) \
            .eq("status", "Available") \
            .execute()
            
        available_rooms = []
        for room in all_rooms_result.data:
            if check_room_availability(room["room_number"], check_in, check_out):
                available_rooms.append(room)
                
        return available_rooms
    except Exception as e:
        logging.error(f"Error getting available rooms: {e}")
        return []

@router.get("/room-types/available-for-booking")
def get_available_room_types_for_booking():
    """Get available room types with actual room availability"""
    try:
        result = supabase.table("room_types").select("*").eq("is_available", True).execute()
        
        room_types = []
        for room_type in result.data:
            # Check if there are actually available rooms of this type using room_type_id
            available_rooms = supabase.table("rooms") \
                .select("room_number") \
                .eq("room_type_id", room_type["id"]) \
                .eq("status", "Available") \
                .execute()
                
            # Only include room types that have available rooms
            if available_rooms.data:
                # Handle potential missing columns with defaults
                max_adults = room_type.get("max_adults", 2)
                max_children = room_type.get("max_children", 1)
                amenities = room_type.get("amenities", [])
                
                room_types.append({
                    "id": room_type["id"],
                    "name": room_type["name"],
                    "base_price": room_type["base_price"],
                    "max_adults": max_adults,
                    "max_children": max_children,
                    "total_capacity": max_adults + max_children,
                    "amenities": amenities,
                    "available_rooms_count": len(available_rooms.data)
                })
                
        return {"room_types": room_types}
    except Exception as e:
        logging.error(f"Error getting available room types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add endpoint for admin to get room types (same as above but different route)
@router.get("/room-types/available")
def get_available_room_types_for_admin():
    """Get available room types for admin interface"""
    return get_available_room_types_for_booking()["room_types"]

@router.get("/room-types-with-availability")
def get_room_types_with_availability():
    """Get all room types with their actual availability status"""
    try:
        result = supabase.table("room_types").select("*").execute()
        
        room_types = []
        for room_type in result.data:
            # Check actual room availability using room_type_id
            available_rooms = supabase.table("rooms") \
                .select("room_number") \
                .eq("room_type_id", room_type["id"]) \
                .eq("status", "Available") \
                .execute()
                
            total_rooms = supabase.table("rooms") \
                .select("room_number") \
                .eq("room_type_id", room_type["id"]) \
                .execute()
                
            # Room type is actually available if it has available rooms
            actual_availability = len(available_rooms.data) > 0
            
            # Handle potential missing columns with defaults
            max_adults = room_type.get("max_adults", 2)
            max_children = room_type.get("max_children", 1)
            amenities = room_type.get("amenities", [])
            
            room_types.append({
                "id": room_type["id"],
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "is_available": actual_availability,  # Use actual availability
                "amenities": amenities,
                "max_adults": max_adults,
                "max_children": max_children,
                "total_capacity": max_adults + max_children,
                "available_rooms_count": len(available_rooms.data),
                "total_rooms_count": len(total_rooms.data)
            })
            
        return room_types
    except Exception as e:
        logging.error(f"Error getting room types with availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# NEW ROUTE: Frontend-compatible booking endpoint (for user bookings)
@router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_request: FrontendBookingRequest):
    """Create a new booking - matches frontend expectation with validation"""
    logging.info("📥 Received validated booking request from frontend")
    
    try:
        logging.info(f"🔍 Processing booking for room_type_id: {booking_request.room_type_id}")
        
        # Parse dates (already validated by the model)
        check_in_date = datetime.fromisoformat(booking_request.check_in).date()
        check_out_date = datetime.fromisoformat(booking_request.check_out).date()
        
        # Get room type details
        room_type_result = supabase.table("room_types").select("*").eq("id", booking_request.room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        logging.info(f"✅ Room type found: {room_type['name']} (ID: {room_type['id']})")
        
        # Get available rooms for this room type ID and date range
        available_rooms = get_available_rooms_for_type_id(room_type["id"], check_in_date, check_out_date)
        
        logging.info(f"🏨 Found {len(available_rooms)} available rooms for '{room_type['name']}'")
        
        if not available_rooms:
            raise HTTPException(
                status_code=400, 
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}. Please try different dates or contact support."
            )
        
        # Select the first available room
        selected_room = available_rooms[0]
        available_room = selected_room["room_number"]
        actual_room_type = selected_room["room_type"]
        
        logging.info(f"🏨 Allocated room: {available_room} (Type: {actual_room_type})")
        
        # Generate booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)
        
        # Calculate nights and validate total
        nights = (check_out_date - check_in_date).days or 1
        calculated_total = nights * room_type["base_price"]
        
        # Use calculated total if frontend total seems incorrect
        if abs(booking_request.total_amount - calculated_total) > calculated_total * 0.1:  # 10% tolerance
            logging.warning(f"⚠️ Total amount mismatch. Using calculated: {calculated_total}")
            total_amount = calculated_total
        else:
            total_amount = booking_request.total_amount
        
        # Split guest name
        name_parts = booking_request.guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Ensure status is not None and has a default value
        booking_status = booking_request.status or "confirmed"
        
        # Insert booking - Handle both admin (user_id = null) and user bookings
        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": booking_request.check_in,
            "check_out": booking_request.check_out,
            "guests": getattr(booking_request, 'guests', 2) or 2,  # Default to 2 if null
            "room_number": available_room,
            "room_type": actual_room_type,
            "first_name": first_name,
            "last_name": last_name,
            "email": booking_request.guest_email,
            "phone": int(booking_request.guest_phone) if booking_request.guest_phone and booking_request.guest_phone.isdigit() else 0,
            "status": booking_status,
            "source": "Direct",
            "user_id": booking_request.user_id,  # This can be null for admin bookings
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase.table("bookings").insert(booking_insert_data).execute()
        logging.info("✅ Booking saved")
        
        # Insert billing
        supabase.table("billing").insert({
            "booking_id": booking_id,
            "room_price": room_type["base_price"],
            "discount": 0.0,
            "vat": 13.0,  # Default VAT
            "total_amount": total_amount,
            "payment_method": "Online",
            "payment_status": "Paid",
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logging.info("✅ Billing saved")
        
        # Update room status only if booking is confirmed
        if booking_status.lower() == "confirmed":
            supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", available_room).execute()
            logging.info("🏨 Room marked as Occupied")
        
        return BookingResponse(
            success=True,
            booking_id=booking_id,
            room_number=available_room,
            total_amount=total_amount,
            message="Booking created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❗ Error creating booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

# ADMIN BOOKING ROUTE: For admin interface with full control
@router.post("/admin/bookings")
async def create_admin_booking(booking_data: dict):
    """Create a new booking via admin interface"""
    logging.info("📥 Received admin booking request")
    
    try:
        # Extract data from the admin request format
        room_type_id = booking_data.get("room_type_id")
        user_id = booking_data.get("user_id")  # Can be null for admin bookings
        guest_name = booking_data.get("guest_name", "")
        guest_email = booking_data.get("guest_email", "")
        guest_phone = booking_data.get("guest_phone", "")
        check_in = booking_data.get("check_in")
        check_out = booking_data.get("check_out")
        total_amount = booking_data.get("total_amount", 0)
        special_requests = booking_data.get("special_requests", "")
        status = booking_data.get("status", "confirmed")
        
        logging.info(f"🔍 Processing admin booking for room_type_id: {room_type_id}")
        
        # Parse dates
        check_in_date = datetime.fromisoformat(check_in).date()
        check_out_date = datetime.fromisoformat(check_out).date()
        
        # Get room type details
        room_type_result = supabase.table("room_types").select("*").eq("id", room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        logging.info(f"✅ Room type found: {room_type['name']} (ID: {room_type['id']})")
        
        # Get available rooms for this room type ID and date range
        available_rooms = get_available_rooms_for_type_id(room_type["id"], check_in_date, check_out_date)
        
        logging.info(f"🏨 Found {len(available_rooms)} available rooms for '{room_type['name']}'")
        
        if not available_rooms:
            raise HTTPException(
                status_code=400, 
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}."
            )
        
        # Select the first available room
        selected_room = available_rooms[0]
        available_room = selected_room["room_number"]
        actual_room_type = selected_room["room_type"]
        
        logging.info(f"🏨 Allocated room: {available_room} (Type: {actual_room_type})")
        
        # Generate booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)
        
        # Split guest name
        name_parts = guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""
        
        # Insert booking - Admin bookings can have null user_id
        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,  # Default for admin bookings
            "room_number": available_room,
            "room_type": actual_room_type,
            "first_name": first_name,
            "last_name": last_name,
            "email": guest_email,
            "phone": int(guest_phone) if guest_phone and guest_phone.isdigit() else 0,
            "status": status,
            "source": "Admin",
            "user_id": user_id,  # Can be null for admin bookings
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase.table("bookings").insert(booking_insert_data).execute()
        logging.info("✅ Admin booking saved")
        
        # Insert billing
        supabase.table("billing").insert({
            "booking_id": booking_id,
            "room_price": room_type["base_price"],
            "discount": 0.0,
            "vat": 13.0,
            "total_amount": total_amount or (room_type["base_price"] * ((check_out_date - check_in_date).days or 1)),
            "payment_method": "Admin",
            "payment_status": "Pending",
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logging.info("✅ Billing saved")
        
        # Update room status only if booking is confirmed
        if status.lower() == "confirmed":
            supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", available_room).execute()
            logging.info("🏨 Room marked as Occupied")
        
        return {
            "success": True,
            "booking_id": booking_id,
            "room_number": available_room,
            "total_amount": total_amount,
            "message": "Admin booking created successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❗ Error creating admin booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Admin booking failed: {str(e)}")

# EXISTING ROUTE: Keep the original book-room endpoint for backward compatibility (UPDATED)
@router.post("/book-room")
async def book_room(data: BookingRequest):
    logging.info("📥 Received booking request via book-room endpoint")
    booking_data = data.booking
    billing_data = data.billing
    inserted_booking_str_id = None
    room_status_updated = False
    
    try:
        logging.info(f"🔎 Checking room availability for room {booking_data.room_number}")
        
        # Check if room exists and get room type details
        room_result = supabase.table("rooms").select("*").eq("room_number", booking_data.room_number).execute()
        if not room_result.data:
            logging.warning(f"❌ Room {booking_data.room_number} not found")
            raise HTTPException(status_code=404, detail="Room not found")
        
        room = room_result.data[0]
        logging.info(f"✅ Room found: {room}")
        
        # Add null check for room status
        room_status = room.get("status", "").lower() if room.get("status") else ""
        if room_status == "maintenance":
            logging.warning("❌ Room is under maintenance")
            raise HTTPException(status_code=400, detail="Room is under maintenance")
        
        # Check guest capacity using room type name (handle null guests)
        guest_count = booking_data.guests or 1  # Default to 1 if null
        if not check_guest_capacity_by_name(booking_data.room_type, guest_count):
            raise HTTPException(status_code=400, detail="Number of guests exceeds room capacity")
        
        if not check_room_availability(booking_data.room_number, booking_data.check_in, booking_data.check_out):
            logging.warning("❌ Room is not available for the selected dates")
            raise HTTPException(status_code=400, detail="Room is not available for the selected dates")
        
        logging.info("✅ Room is available for the selected dates")
        
        # Get room price from room_types table using room type name
        room_type_result = supabase.table("room_types").select("base_price").eq("name", booking_data.room_type).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type pricing not found")
            
        room_price = room_type_result.data[0]["base_price"]
        
        # Calculate total
        nights = (booking_data.check_out - booking_data.check_in).days or 1
        discount_amount = (room_price * nights) * billing_data.discount / 100
        vat_amount = ((room_price * nights) - discount_amount) * billing_data.vat / 100
        total_amount = (room_price * nights - discount_amount) + vat_amount
        
        logging.info(f"💰 Total: {total_amount} (Nights: {nights}, Price/Night: {room_price})")
        
        # Generate booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)
        
        logging.info(f"🆕 Booking ID: {booking_id}")
        
        # Ensure status is not None
        booking_status = booking_data.status or "confirmed"
        
        # Insert booking - Handle null user_id for admin bookings
        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": booking_data.check_in.isoformat(),
            "check_out": booking_data.check_out.isoformat(),
            "guests": guest_count,  # Use the null-safe guest count
            "room_number": booking_data.room_number,
            "room_type": booking_data.room_type,
            "first_name": booking_data.first_name,
            "last_name": booking_data.last_name,
            "email": booking_data.email,
            "phone": booking_data.phone,
            "status": booking_status,
            "source": booking_data.source or "Direct",
            "user_id": getattr(booking_data, 'user_id', None),  # Can be null for admin bookings
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase.table("bookings").insert(booking_insert_data).execute()
        inserted_booking_str_id = booking_id
        logging.info("✅ Booking saved")
        
        # Insert billing
        supabase.table("billing").insert({
            "booking_id": booking_id,
            "room_price": room_price,
            "discount": billing_data.discount,
            "vat": billing_data.vat,
            "total_amount": total_amount,
            "payment_method": billing_data.payment_method,
            "payment_status": billing_data.payment_status,
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logging.info("✅ Billing saved")
        
        # Update room status if confirmed
        if booking_status.lower() == "confirmed":
            supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", booking_data.room_number).execute()
            room_status_updated = True
            logging.info("🏨 Room marked as Occupied")
        
        return {
            "message": "Booking and billing successful",
            "booking_id": booking_id,
            "total_amount": total_amount
        }
        
    except Exception as e:
        logging.error(f"❗ Error: {e}")
        
        # Rollback on error
        if inserted_booking_str_id:
            supabase.table("bookings").delete().eq("booking_id", inserted_booking_str_id).execute()
            logging.info("🧹 Rolled back booking")
        if room_status_updated:
            supabase.table("rooms").update({"status": "Available"}).eq("room_number", booking_data.room_number).execute()
            logging.info("🧹 Room status reverted")
        
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")

# Rest of your existing endpoints remain the same...
@router.get("/debug/rooms-and-types")
def debug_rooms_and_types():
    """Debug endpoint to check room types and rooms matching"""
    try:
        room_types = supabase.table("room_types").select("*").execute()
        rooms = supabase.table("rooms").select("*").execute()
        
        # Check availability for each room type
        availability_info = []
        for rt in room_types.data:
            # Use room_type_id for matching in rooms table
            available_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"] and r.get("status") == "Available"]
            total_rooms = [r for r in rooms.data if r.get("room_type_id") == rt["id"]]
            
            availability_info.append({
                "room_type": rt["name"],
                "room_type_id": rt["id"],
                "total_rooms": len(total_rooms),
                "available_rooms": len(available_rooms),
                "available_room_numbers": [r["room_number"] for r in available_rooms],
                "max_adults": rt.get("max_adults", "Not set"),
                "max_children": rt.get("max_children", "Not set"),
                "amenities": rt.get("amenities", [])
            })
        
        return {
            "room_types": room_types.data,
            "rooms": rooms.data,
            "bookings_table_schema": "bookings table only has room_type (name), not room_type_id",
            "room_type_names": [rt["name"] for rt in room_types.data],
            "room_type_ids_in_rooms": list(set([r.get("room_type_id", "NULL") for r in rooms.data])),
            "availability_summary": availability_info
        }
    except Exception as e:
        logging.error(f"Error in debug endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-rooms/{room_type}")
def get_available_rooms(
    room_type: str,
    check_in: date = Query(...),
    check_out: date = Query(...)
):
    try:
        available_rooms = get_available_rooms_for_type(room_type, check_in, check_out)
        
        # Get room details with pricing from room_types
        detailed_rooms = []
        for room in available_rooms:
            # Get room type details for pricing using name
            room_type_result = supabase.table("room_types") \
                .select("base_price, amenities, max_adults, max_children") \
                .eq("name", room["room_type"]) \
                .execute()
            
            if room_type_result.data:
                room_type_data = room_type_result.data[0]
                detailed_rooms.append({
                    "room_number": room["room_number"],
                    "room_type": room["room_type"],
                    "price": room_type_data["base_price"],
                    "capacity": (room_type_data.get("max_adults", 2) + room_type_data.get("max_children", 1)),
                    "amenities": room_type_data.get("amenities", [])
                })
        
        return {"available_rooms": detailed_rooms}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching rooms: {str(e)}")

# Include all your other existing endpoints (update, cancel, get bookings, etc.)
# They remain the same as in the previous version...

@router.get("/bookings")
def get_all_bookings():
    """Get all bookings with billing information"""
    try:
        # Get bookings with billing info
        bookings_result = supabase.table("bookings") \
            .select("*, billing(*)") \
            .execute()
        
        return {"bookings": bookings_result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bookings/{booking_id}")
def get_booking(booking_id: str):
    """Get a specific booking with billing information"""
    try:
        booking_result = supabase.table("bookings") \
            .select("*, billing(*)") \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        return booking_result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/bookings/user/{user_id}")
def get_user_bookings(user_id: int):
    """Get all bookings for a specific user"""
    try:
        bookings_result = supabase.table("bookings") \
            .select("*, billing(*)") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .execute()
        
        return {"bookings": bookings_result.data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
