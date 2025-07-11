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
    """
    Improved room availability check with better logic
    Returns True if room is available for the entire date range
    """
    try:
        # Only check for confirmed/active bookings that would block the room
        conflicting_bookings = (
            supabase.table("bookings")
            .select("id, check_in, check_out, status")
            .eq("room_number", room_number)
            .neq("status","Maintenance")
            .execute()
        )
        
        for booking in conflicting_bookings.data:
            booking_check_in = booking["check_in"]
            booking_check_out = booking["check_out"]
            
            # Convert string dates to date objects if needed
            if isinstance(booking_check_in, str):
                booking_check_in = date.fromisoformat(booking_check_in)
            if isinstance(booking_check_out, str):
                booking_check_out = date.fromisoformat(booking_check_out)
            
            # Check for date overlap
            # Overlap occurs if: check_in < booking_check_out AND check_out > booking_check_in
            if check_in < booking_check_out and check_out > booking_check_in:
                return False  # Room is not available due to this booking
        
        return True  # No conflicts found, room is available
        
    except Exception as e:
        logging.error(f"Error checking room availability for {room_number}: {e}")
        return False  # Assume not available on error

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
            .execute()
            
        available_rooms = []
        for room in all_rooms_result.data:
            if check_room_availability(room["room_number"], check_in, check_out):
                # Ensure room_type is set to the correct name
                room_with_type = {
                    "room_number": room["room_number"],
                    "room_type": room.get("room_type") or room_type_name,  # Use room_type_name if room_type is None
                    "room_type_id": room["room_type_id"],
                    "status": room["status"]
                }
                available_rooms.append(room_with_type)
                
        return available_rooms
    except Exception as e:
        logging.error(f"Error getting available rooms: {e}")
        return []

def get_available_rooms_for_type(room_type_name: str, check_in: date, check_out: date) -> List[dict]:
    """Get all available rooms for a specific room type name and date range"""
    try:
        # Get all rooms of this type (excluding Maintenance)
        all_rooms_result = (
            supabase.table("rooms")
            .select("room_number, room_type, room_type_id, status")
            .eq("room_type", room_type_name)
            .neq("status", "Maintenance")  # Only exclude maintenance
            .execute()
        )

        available_rooms = []
        for room in all_rooms_result.data:
            if check_room_availability(room["room_number"], check_in, check_out):
                # Room is truly available based on date range
                available_rooms.append(room)

        return available_rooms

    except Exception as e:
        logging.error(f"Error getting available rooms: {e}")
        return []

# FIXED: Customer-side room types endpoint
@router.get("/room-types/available-for-booking")
def get_available_room_types_for_booking(
    check_in: date = Query(...),
    check_out: date = Query(...)):
    """Get room types that have actually available rooms during selected dates"""
    try:
        result = supabase.table("room_types").select("*").eq("is_available", True).execute()
        
        room_types = []
        for room_type in result.data:
            available_rooms = get_available_rooms_for_type(room_type["name"], check_in, check_out)
            
            if available_rooms:
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
                    "available_rooms_count": len(available_rooms),
                    "description": room_type.get("description", ""),
                    "image_url": room_type.get("image_url", ""),
                    "is_available": True
                })
        
        return {"room_types": room_types}
    except Exception as e:
        logging.error(f"Error getting available room types: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# FIXED: Admin-side room types endpoint
@router.get("/room-types/available")
def get_available_room_types_for_admin(
    check_in: date = Query(...),
    check_out: date = Query(...)):
    """Get room types with actual available rooms for admin during selected dates"""
    try:
        result = supabase.table("room_types").select("*").execute()
        
        room_types = []
        for room_type in result.data:
            available_rooms = get_available_rooms_for_type(room_type["name"], check_in, check_out)
            
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
                "available_rooms_count": len(available_rooms),
                "description": room_type.get("description", ""),
                "image_url": room_type.get("image_url", ""),
                "is_available": len(available_rooms) > 0
            })
        
        return room_types
    except Exception as e:
        logging.error(f"Error getting room types for admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/room_types/{room_type_id}")
def get_room_type_by_id(room_type_id: int):
    """Get full room type details by ID"""
    try:
        result = supabase.table("room_types").select("*").eq("id", room_type_id).single().execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        return result.data
    except Exception as e:
        logging.error(f"Error fetching room type by ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch room type")


@router.get("/room-types-with-availability")
def get_room_types_with_availability():
    """Get all room types with their actual availability status"""
    try:
        result = supabase.table("room_types").select("*").execute()

        room_types = []
        for room_type in result.data:
            room_type_id = room_type["id"]

            # Fetch all rooms for this room type
            all_rooms_result = supabase.table("rooms") \
                .select("room_number, status") \
                .eq("room_type_id", room_type_id) \
                .execute()

            room_list = all_rooms_result.data or []
            total_rooms_count = len(room_list)

            # Count rooms not in 'Maintenance'
            usable_rooms = [room for room in room_list if room["status"] != "Maintenance"]
            available_rooms_count = len(usable_rooms)

            # Availability = at least one usable room exists
            actual_availability = available_rooms_count > 0

            # Handle defaults
            max_adults = room_type.get("max_adults", 2)
            max_children = room_type.get("max_children", 1)
            amenities = room_type.get("amenities", [])

            room_types.append({
                "id": room_type_id,
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "is_available": actual_availability,
                "amenities": amenities,
                "max_adults": max_adults,
                "max_children": max_children,
                "total_capacity": max_adults + max_children,
                "available_rooms_count": available_rooms_count,
                "total_rooms_count": total_rooms_count
            })

        return room_types

    except Exception as e:
        logging.error(f"Error getting room types with availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# FIXED: Available rooms endpoint for admin
@router.get("/available-rooms/{room_type}")
def get_available_rooms(
    room_type: str,
    check_in: date = Query(...),
    check_out: date = Query(...)):
    """Get available rooms for a specific room type and date range"""
    try:
        logging.info(f"🔍 Getting available rooms for type: {room_type}, dates: {check_in} to {check_out}")

        # Fetch rooms for this room_type (case-insensitive) and not under maintenance
        all_rooms_result = (
            supabase.table("rooms")
            .select("room_number, room_type, room_type_id, status")
            .ilike("room_type", room_type)  # Case-insensitive match
            .neq("status", "Maintenance")   # Exclude maintenance
            .execute()
        )

        if not all_rooms_result.data:
            logging.warning(f"No rooms found for room_type '{room_type}'")
            return {"available_rooms": []}

        # Filter available by checking for date range conflict
        available_rooms = []
        for room in all_rooms_result.data:
            if check_room_availability(room["room_number"], check_in, check_out):
                available_rooms.append(room)

        # Get price and capacity from room_types table (single query)
        room_type_result = supabase.table("room_types") \
            .select("base_price, amenities, max_adults, max_children") \
            .ilike("name", room_type) \
            .execute()

        if not room_type_result.data:
            logging.warning(f"Room type info not found for '{room_type}'")
            return {"available_rooms": []}

        room_type_info = room_type_result.data[0]

        # Final room list with detailed info
        detailed_rooms = [{
            "room_number": room["room_number"],
            "room_type": room["room_type"],
            "price": room_type_info["base_price"],
            "capacity": (room_type_info.get("max_adults", 2) + room_type_info.get("max_children", 1)),
            "amenities": room_type_info.get("amenities", [])
        } for room in available_rooms]

        logging.info(f"✅ Found {len(detailed_rooms)} available rooms")
        return {"available_rooms": detailed_rooms}

    except Exception as e:
        logging.error(f"Error fetching available rooms: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching rooms: {str(e)}")




# NEW ROUTE: Frontend-compatible booking endpoint (for user bookings)
@router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_request: FrontendBookingRequest):
    """Create a new booking - matches frontend expectation with validation"""
    logging.info("📥 Received validated booking request from frontend")

    inserted_booking_str_id = None  # 👈 For rollback

    try:
        logging.info(f"🔍 Processing booking for room_type_id: {booking_request.room_type_id}")

        check_in_date = datetime.fromisoformat(booking_request.check_in).date()
        check_out_date = datetime.fromisoformat(booking_request.check_out).date()

        room_type_result = supabase.table("room_types").select("*").eq("id", booking_request.room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")

        room_type = room_type_result.data[0]
        logging.info(f"✅ Room type found: {room_type['name']} (ID: {room_type['id']})")

        available_rooms = get_available_rooms_for_type_id(room_type["id"], check_in_date, check_out_date)
        logging.info(f"🏨 Found {len(available_rooms)} available rooms for '{room_type['name']}'")

        if not available_rooms:
            raise HTTPException(
                status_code=400,
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}. Please try different dates or contact support."
            )

        selected_room = available_rooms[0]
        available_room = selected_room["room_number"]
        actual_room_type = selected_room["room_type"] or room_type["name"]

        logging.info(f"🏨 Allocated room: {available_room} (Type: {actual_room_type})")

        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)

        nights = (check_out_date - check_in_date).days or 1
        calculated_total = nights * room_type["base_price"]

        if abs(booking_request.total_amount - calculated_total) > calculated_total * 0.1:
            logging.warning(f"⚠️ Total amount mismatch. Using calculated: {calculated_total}")
            total_amount = calculated_total
        else:
            total_amount = booking_request.total_amount

        name_parts = booking_request.guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        booking_status = booking_request.status or "pending"

        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": booking_request.check_in,
            "check_out": booking_request.check_out,
            "guests": getattr(booking_request, 'guests', 2) or 2,
            "room_number": available_room,
            "room_type": actual_room_type,
            "first_name": first_name,
            "last_name": last_name,
            "email": booking_request.guest_email,
            "phone": int(booking_request.guest_phone) if booking_request.guest_phone and booking_request.guest_phone.isdigit() else 0,
            "status": booking_status,
            "source": "Direct",
            "user_id": booking_request.user_id,
            "special_requests": getattr(booking_request, 'special_requests', ''),
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("bookings").insert(booking_insert_data).execute()
        inserted_booking_str_id = booking_id  # ✅ For rollback tracking
        logging.info("✅ Booking saved")

        return BookingResponse(
            success=True,
            booking_id=booking_id,
            room_number=available_room,
            total_amount=total_amount,
            message="Booking created successfully"
        )

    except HTTPException:
        # Let FastAPI handle HTTP errors normally
        raise

    except Exception as e:
        logging.error(f"❗ Error creating booking: {e}")
        import traceback
        traceback.print_exc()

        if inserted_booking_str_id:
            supabase.table("bookings").delete().eq("booking_id", inserted_booking_str_id).execute()
            logging.info("🧹 Rolled back booking (frontend)")

        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")




# ADMIN BOOKING ROUTE: For admin interface with full control - UPDATED FOR NEW BILLING FLOW
@router.post("/bookings", response_model=BookingResponse)
async def create_booking(booking_request: FrontendBookingRequest):
    """Create a new booking - matches frontend expectation with validation"""
    logging.info("📥 Received validated booking request from frontend")

    inserted_booking_str_id = None  # 👈 For rollback

    try:
        logging.info(f"🔍 Processing booking for room_type_id: {booking_request.room_type_id}")

        check_in_date = datetime.fromisoformat(booking_request.check_in).date()
        check_out_date = datetime.fromisoformat(booking_request.check_out).date()

        room_type_result = supabase.table("room_types").select("*").eq("id", booking_request.room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")

        room_type = room_type_result.data[0]
        logging.info(f"✅ Room type found: {room_type['name']} (ID: {room_type['id']})")

        available_rooms = get_available_rooms_for_type_id(room_type["id"], check_in_date, check_out_date)
        logging.info(f"🏨 Found {len(available_rooms)} available rooms for '{room_type['name']}'")

        if not available_rooms:
            raise HTTPException(
                status_code=400,
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}. Please try different dates or contact support."
            )

        selected_room = available_rooms[0]
        available_room = selected_room["room_number"]
        actual_room_type = selected_room["room_type"] or room_type["name"]

        logging.info(f"🏨 Allocated room: {available_room} (Type: {actual_room_type})")

        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)

        nights = (check_out_date - check_in_date).days or 1
        calculated_total = nights * room_type["base_price"]

        if abs(booking_request.total_amount - calculated_total) > calculated_total * 0.1:
            logging.warning(f"⚠️ Total amount mismatch. Using calculated: {calculated_total}")
            total_amount = calculated_total
        else:
            total_amount = booking_request.total_amount

        name_parts = booking_request.guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        booking_status = booking_request.status or "pending"

        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": booking_request.check_in,
            "check_out": booking_request.check_out,
            "guests": getattr(booking_request, 'guests', 2) or 2,
            "room_number": available_room,
            "room_type": actual_room_type,
            "first_name": first_name,
            "last_name": last_name,
            "email": booking_request.guest_email,
            "phone": int(booking_request.guest_phone) if booking_request.guest_phone and booking_request.guest_phone.isdigit() else 0,
            "status": booking_status,
            "source": "Direct",
            "user_id": booking_request.user_id,
            "special_requests": getattr(booking_request, 'special_requests', ''),
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("bookings").insert(booking_insert_data).execute()
        inserted_booking_str_id = booking_id  # ✅ For rollback tracking
        logging.info("✅ Booking saved")

        return BookingResponse(
            success=True,
            booking_id=booking_id,
            room_number=available_room,
            total_amount=total_amount,
            message="Booking created successfully"
        )

    except HTTPException:
        # Let FastAPI handle HTTP errors normally
        raise

    except Exception as e:
        logging.error(f"❗ Error creating booking: {e}")
        import traceback
        traceback.print_exc()

        if inserted_booking_str_id:
            supabase.table("bookings").delete().eq("booking_id", inserted_booking_str_id).execute()
            logging.info("🧹 Rolled back booking (frontend)")

        raise HTTPException(status_code=500, detail=f"Booking failed: {str(e)}")


# ADMIN BOOKING ROUTE: For admin interface with full control - UPDATED FOR NEW BILLING FLOW
@router.post("/admin/bookings")
async def create_admin_booking(booking_data: dict):
    """Create a new booking via admin interface - supports manually selected room number"""
    logging.info("📥 Received admin booking request")
    
    try:
        # Extract data from the admin request format
        room_type_id = booking_data.get("room_type_id")
        room_number_requested = booking_data.get("room_number")  # ✅ NEW
        user_id = booking_data.get("user_id")
        guest_name = booking_data.get("guest_name", "")
        guest_email = booking_data.get("guest_email", "")
        guest_phone = booking_data.get("guest_phone", "")
        check_in = booking_data.get("check_in")
        check_out = booking_data.get("check_out")
        total_amount = booking_data.get("total_amount", 0)
        special_requests = booking_data.get("special_requests", "")
        status = booking_data.get("status", "confirmed")
        
        logging.info(f"🔍 Processing admin booking for room_type_id: {room_type_id}")
        
        check_in_date = datetime.fromisoformat(check_in).date()
        check_out_date = datetime.fromisoformat(check_out).date()
        
        # Get room type info
        room_type_result = supabase.table("room_types").select("*").eq("id", room_type_id).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        logging.info(f"✅ Room type found: {room_type['name']}")

        # Get available rooms for type ID
        available_rooms = get_available_rooms_for_type_id(room_type["id"], check_in_date, check_out_date)
        if not available_rooms:
            raise HTTPException(
                status_code=400,
                detail=f"No rooms available for '{room_type['name']}' from {check_in_date} to {check_out_date}."
            )
        logging.info(f"🏨 {len(available_rooms)} rooms available for this booking")

        # ✅ Select requested room if valid, fallback otherwise
        selected_room = next((room for room in available_rooms if room["room_number"] == room_number_requested), None)
        if not selected_room:
            logging.warning(f"⚠️ Requested room '{room_number_requested}' not found in available list. Picking first available.")
            # Use the room_number passed by frontend if provided
        requested_room_number = booking_data.get("room_number")

        if requested_room_number:
            # Validate it's among available ones
            matching_room = next(
                (room for room in available_rooms if room["room_number"] == requested_room_number),
                None
            )
            if not matching_room:
                raise HTTPException(
                    status_code=400,
                    detail=f"Room {requested_room_number} is not available for booking from {check_in_date} to {check_out_date}."
                )
            selected_room = matching_room
        else:
            # Auto assign the first one
            selected_room = available_rooms[0]

        available_room = selected_room["room_number"]
        actual_room_type = selected_room["room_type"]


        logging.info(f"🏨 Room assigned: {available_room} (Type: {actual_room_type})")

        # Generate Booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)

        # Split guest name
        name_parts = guest_name.split(" ", 1)
        first_name = name_parts[0]
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        # Insert booking
        booking_insert_data = {
            "booking_id": booking_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,
            "room_number": available_room,
            "room_type": actual_room_type,
            "first_name": first_name,
            "last_name": last_name,
            "email": guest_email,
            "phone": guest_phone,
            "status": status,
            "source": "Admin",
            "user_id": user_id,
            "is_updated": False,
            "special_requests": special_requests,
            "created_at": datetime.utcnow().isoformat()
        }

        supabase.table("bookings").insert(booking_insert_data).execute()
        logging.info("✅ Booking saved")

        # Billing Settings
        settings_result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()
        vat_rate = float(settings_result.data[0]["vat"]) if settings_result.data else 13.0
        discount_rate = float(settings_result.data[0]["discount"]) if settings_result.data else 0.0

        nights = (check_out_date - check_in_date).days or 1
        base_amount = room_type["base_price"] * nights
        discount_amount = base_amount * (discount_rate / 100)
        vat_amount = (base_amount - discount_amount) * (vat_rate / 100)
        final_total = total_amount if total_amount > 0 else (base_amount - discount_amount + vat_amount)

        supabase.table("billing").insert({
            "booking_id": booking_id,
            "room_price": room_type["base_price"],
            "discount": discount_rate,
            "vat": vat_rate,
            "total_amount": final_total,
            "payment_method": "Admin",
            "payment_status": "Pending",
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logging.info("✅ Billing saved")

        # Update room status
        if status.lower() == "confirmed":
            supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", available_room).execute()
            logging.info("🏨 Room marked as Occupied")

        return {
            "success": True,
            "booking_id": booking_id,
            "room_number": available_room,
            "total_amount": final_total,
            "message": "Admin booking created successfully"
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❗ Error creating admin booking: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Admin booking failed: {str(e)}")

# # EXISTING ROUTE: Keep the original book-room endpoint for backward compatibility (UPDATED)


# Rest of your existing endpoints...
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
        
        booking = booking_result.data[0]
        
        # Add guest_name field for compatibility
        if not booking.get("guest_name") and booking.get("first_name"):
            booking["guest_name"] = f"{booking.get('first_name', '')} {booking.get('last_name', '')}".strip()
        
        # Add guest_email field for compatibility
        if not booking.get("guest_email") and booking.get("email"):
            booking["guest_email"] = booking["email"]
            
        # Add guest_phone field for compatibility
        if not booking.get("guest_phone") and booking.get("phone"):
            booking["guest_phone"] = str(booking["phone"])
        
        return booking
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/users")
def search_users(search: str = Query(..., min_length=2)):
    """Search users by email or phone number - Updated for actual schema"""
    try:
        logging.info(f"🔍 Searching users with term: '{search}'")
        
        # Clean the search term
        search_clean = search.strip()
        
        # Since phone is text, we can use ilike for both email and phone
        result = supabase.table("users") \
            .select("id, name, email, phone") \
            .or_(f"email.ilike.%{search_clean}%,phone.ilike.%{search_clean}%") \
            .limit(10) \
            .execute()
        
        # Transform the data to match what the frontend expects (first_name, last_name)
        transformed_users = []
        for user in result.data:
            # Split name into first_name and last_name
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

@router.post("/billing")
async def create_billing_record(billing_data: dict):
    """Create a new billing record and confirm the booking if successful"""
    try:
        booking_id = billing_data.get("booking_id")
        room_price = billing_data.get("room_price")
        payment_method = billing_data.get("payment_method", "pending")
        payment_status = billing_data.get("payment_status", "pending")

        if not booking_id or room_price is None:
            raise HTTPException(status_code=400, detail="booking_id and room_price are required")

        # Safely convert room_price to float
        try:
            room_price = float(room_price)
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="room_price must be a number")

        # Fetch latest billing settings
        settings_result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()

        vat_rate = float(settings_result.data[0]["vat"]) if settings_result.data else 13.0
        discount_rate = float(settings_result.data[0]["discount"]) if settings_result.data else 0.0

        # Get booking info
        booking_result = supabase.table("bookings").select("*").eq("booking_id", booking_id).execute()
        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")

        booking = booking_result.data[0]
        check_in = datetime.fromisoformat(booking["check_in"]).date()
        check_out = datetime.fromisoformat(booking["check_out"]).date()
        nights = max(1, (check_out - check_in).days)

        # Calculate amounts
        base_amount = room_price * nights
        discount_amount = base_amount * (discount_rate / 100)
        discounted_amount = base_amount - discount_amount
        vat_amount = discounted_amount * (vat_rate / 100)
        total_amount = discounted_amount + vat_amount

        # Insert billing
        billing_insert_data = {
            "booking_id": booking_id,
            "room_price": room_price,
            "discount": discount_rate,
            "vat": vat_rate,
            "total_amount": total_amount,
            "payment_method": payment_method,
            "payment_status": payment_status,
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }

        billing_result = supabase.table("billing").insert(billing_insert_data).execute()

        # Mark booking as confirmed
        supabase.table("bookings").update({
            "status": "confirmed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("booking_id", booking_id).execute()

        # Mark room as occupied
        supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", booking["room_number"]).execute()

        logging.info(f"✅ Billing created and booking {booking_id} confirmed")

        return {
            "success": True,
            "billing_id": billing_result.data[0]["id"],
            "total_amount": total_amount,
            "message": "Billing created and booking confirmed"
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Billing creation failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create billing: {str(e)}")


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

@router.get("/user/{user_id}/dashboard")
def get_user_dashboard(user_id: int):
    """Get simple user dashboard data"""
    try:
        # Get user bookings from the simple view
        bookings_result = supabase.table("user_bookings_simple") \
            .select("*") \
            .eq("user_id", user_id) \
            .execute()
        
        bookings = bookings_result.data or []
        
        # Calculate simple statistics
        total_bookings = len(bookings)
        confirmed_bookings = len([b for b in bookings if b["status"] == "confirmed"])
        
        # Calculate total spent (confirmed + completed bookings only)
        total_spent = sum(
            float(b["total_amount"] or 0) 
            for b in bookings 
            if b["status"] in ["confirmed", "completed"]
        )
        
        return {
            "user_id": user_id,
            "statistics": {
                "total_bookings": total_bookings,
                "confirmed_bookings": confirmed_bookings,
                "total_spent": total_spent
            },
            "bookings": bookings
        }
        
    except Exception as e:
        logging.error(f"Error fetching user dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/email/{email}/dashboard")
def get_user_dashboard_by_email(email: str):
    """Get simple user dashboard data by email"""
    try:
        # First, try to find user by email
        user_result = supabase.table("users") \
            .select("id, name, email") \
            .eq("email", email) \
            .execute()
        
        if user_result.data:
            # User exists, get dashboard by user_id
            user_id = user_result.data[0]["id"]
            return get_user_dashboard(user_id)
        else:
            # User doesn't exist in users table, get bookings by email
            bookings_result = supabase.table("user_bookings_simple") \
                .select("*") \
                .eq("email", email) \
                .execute()
            
            bookings = bookings_result.data or []
            
            # Calculate simple statistics
            total_bookings = len(bookings)
            confirmed_bookings = len([b for b in bookings if b["status"] == "confirmed"])
            
            total_spent = sum(
                float(b["total_amount"] or 0) 
                for b in bookings 
                if b["status"] in ["confirmed", "completed"]
            )
            
            return {
                "user_email": email,
                "user_id": None,
                "statistics": {
                    "total_bookings": total_bookings,
                    "confirmed_bookings": confirmed_bookings,
                    "total_spent": total_spent
                },
                "bookings": bookings
            }
            
    except Exception as e:
        logging.error(f"Error fetching user dashboard by email: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str):
    # 1. Fetch booking info
    booking_result = supabase.table("bookings") \
        .select("room_number, status, check_in") \
        .eq("booking_id", booking_id).single().execute()

    if not booking_result.data:
        raise HTTPException(status_code=404, detail="Booking not found")

    booking = booking_result.data
    room_number = booking["room_number"]
    current_status = booking["status"].lower()
    check_in_date = booking["check_in"]

    logging.info(f"📌 Cancelling booking {booking_id} for room {room_number}")

    # 2. Update booking: set cancelled flags
    supabase.table("bookings").update({
        "status": "cancelled",
        "is_cancelled": True,
        "updated_at": datetime.utcnow().isoformat()
    }).eq("booking_id", booking_id).execute()

    logging.info(f"✅ Booking {booking_id} marked as cancelled")

    # 3. Update billing: mark as cancelled (but keep record)
    supabase.table("billing").update({
        "is_cancelled": True,
        "cancelled_at": datetime.utcnow().isoformat()
    }).eq("booking_id", booking_id).execute()

    logging.info(f"💳 Billing for {booking_id} marked as cancelled")

    # 4. Check for other active bookings for the same room (after current check-in date)
    other_future_bookings = supabase.table("bookings") \
        .select("booking_id") \
        .eq("room_number", room_number) \
        .neq("booking_id", booking_id) \
        .eq("is_cancelled", False) \
        .gte("check_in", check_in_date) \
        .execute()

    logging.info(f"🔍 Found {len(other_future_bookings.data)} future bookings for room {room_number}")

    # 5. If no other future active bookings, update room status
    if len(other_future_bookings.data) == 0:
        supabase.table("rooms").update({
            "status": "Available"
        }).eq("room_number", room_number).execute()
        logging.info(f"🏨 Room {room_number} marked as Available")
    else:
        logging.info(f"⛔ Room {room_number} NOT marked available due to future bookings")

    return {
        "success": True,
        "message": f"Booking {booking_id} cancelled. Room availability updated accordingly."
    }

@router.delete("/bookings/{booking_id}/rollback")
def rollback_booking_if_unconfirmed(booking_id: str):
    """Delete booking + reset room if billing wasn't confirmed"""
    try:
        # Check billing status
        result = supabase.table("bookings").select("*").eq("booking_id", booking_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Booking not found")

        booking = result.data[0]
        if booking.get("billing_confirmed"):
            return {"message": "Billing already confirmed. No rollback."}

        # Mark room available again
        supabase.table("rooms").update({"status": "Available"}).eq("room_number", booking["room_number"]).execute()

        # Delete booking
        supabase.table("bookings").delete().eq("booking_id", booking_id).execute()
        return {"message": "Booking rolled back"}
    
    except Exception as e:
        logging.error(f"❌ Rollback failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
