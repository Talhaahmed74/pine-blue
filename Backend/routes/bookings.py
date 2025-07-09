from fastapi import APIRouter, HTTPException, Query
from models.booking import Booking, BookingUpdate
from models.booking_request import BookingRequest
from supabase_client import supabase
from datetime import datetime, date
from typing import Optional
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

def check_guest_capacity(room_type_name: str, guests: int) -> bool:
    """Check if the number of guests doesn't exceed room capacity"""
    try:
        room_type_result = supabase.table("room_types").select("max_adults", "max_children").eq("name", room_type_name).execute()
        if not room_type_result.data:
            return False
        
        room_type = room_type_result.data[0]
        max_capacity = room_type["max_adults"] + room_type["max_children"]
        
        return guests <= max_capacity
    except Exception as e:
        logging.error(f"Error checking guest capacity: {e}")
        return False

@router.get("/room-types/available-for-booking")
def get_available_room_types_for_booking():
    """Get available room types with pricing for customer booking"""
    try:
        result = supabase.table("room_types").select("*").eq("is_available", True).execute()
        
        room_types = []
        for room_type in result.data:
            room_types.append({
                "id": room_type["id"],
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "max_adults": room_type["max_adults"],
                "max_children": room_type["max_children"],
                "total_capacity": room_type["max_adults"] + room_type["max_children"],
                "amenities": room_type["amenities"]
            })
        
        return {"room_types": room_types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/book-room")
async def book_room(data: BookingRequest):
    logging.info("📥 Received booking request")
    booking_data = data.booking
    billing_data = data.billing
    inserted_booking_str_id = None
    room_status_updated = False

    try:
        logging.info(f"🔎 Checking room availability for room {booking_data.room_number}")
        
        # Check if room exists and get room type details
        room_result = supabase.table("rooms_with_details").select("*").eq("room_number", booking_data.room_number).execute()
        if not room_result.data:
            logging.warning(f"❌ Room {booking_data.room_number} not found")
            raise HTTPException(status_code=404, detail="Room not found")

        room = room_result.data[0]
        logging.info(f"✅ Room found: {room}")

        if room["status"].lower() == "maintenance":
            logging.warning("❌ Room is under maintenance")
            raise HTTPException(status_code=400, detail="Room is under maintenance")

        # Check guest capacity
        if not check_guest_capacity(booking_data.room_type, booking_data.guests):
            raise HTTPException(status_code=400, detail="Number of guests exceeds room capacity")

        if not check_room_availability(booking_data.room_number, booking_data.check_in, booking_data.check_out):
            logging.warning("❌ Room is not available for the selected dates")
            raise HTTPException(status_code=400, detail="Room is not available for the selected dates")

        logging.info("✅ Room is available for the selected dates")

        # Calculate total
        nights = (booking_data.check_out - booking_data.check_in).days or 1
        room_price = room["price"]
        discount_amount = (room_price * nights) * billing_data.discount / 100
        vat_amount = ((room_price * nights) - discount_amount) * billing_data.vat / 100
        total_amount = (room_price * nights - discount_amount) + vat_amount

        logging.info(f"💰 Total: {total_amount} (Nights: {nights}, Price/Night: {room_price})")

        # Generate booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)

        logging.info(f"🆕 Booking ID: {booking_id}")

        # Insert booking
        supabase.table("bookings").insert({
            "booking_id": booking_id,
            "check_in": booking_data.check_in.isoformat(),
            "check_out": booking_data.check_out.isoformat(),
            "guests": booking_data.guests,
            "room_number": booking_data.room_number,
            "room_type": booking_data.room_type,
            "first_name": booking_data.first_name,
            "last_name": booking_data.last_name,
            "email": booking_data.email,
            "phone": booking_data.phone,
            "status": booking_data.status,
            "source": booking_data.source,
            "is_updated": False,
            "created_at": datetime.utcnow().isoformat()
        }).execute()

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
        if booking_data.status.lower() == "confirmed":
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

@router.get("/available-rooms/{room_type}")
def get_available_rooms(
    room_type: str,
    check_in: date = Query(...),
    check_out: date = Query(...)):
    try:
        # Get all rooms of this type that are NOT in Maintenance
        all_rooms_result = supabase.table("rooms_with_details") \
            .select("room_number, room_type, price, capacity, amenities") \
            .eq("room_type", room_type) \
            .neq("status", "Maintenance") \
            .execute()

        all_room_numbers = [room["room_number"] for room in all_rooms_result.data]
        
        if not all_room_numbers:
            return {"available_rooms": []}

        # Get all bookings that overlap with given date range
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .in_("room_number", all_room_numbers) \
            .neq("status", "cancelled") \
            .execute()

        unavailable = set()
        for booking in overlapping_result.data:
            b_check_in = datetime.fromisoformat(booking["check_in"]).date()
            b_check_out = datetime.fromisoformat(booking["check_out"]).date()
            
            if not (b_check_out <= check_in or b_check_in >= check_out):
                unavailable.add(booking["room_number"])

        # Filter out unavailable rooms and return detailed info
        available_rooms = []
        for room in all_rooms_result.data:
            if room["room_number"] not in unavailable:
                available_rooms.append({
                    "room_number": room["room_number"],
                    "room_type": room["room_type"],
                    "price": room["price"],
                    "capacity": room["capacity"],
                    "amenities": room["amenities"]
                })

        return {"available_rooms": available_rooms}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching rooms: {str(e)}")

@router.put("/update-booking/{booking_id}")
def update_booking(booking_id: str, data: BookingUpdate):
    """Update booking details with improved validation and billing recalculation"""
    logging.info(f"📝 Received update request for booking {booking_id}")
    
    try:
        # Get current booking details
        current_booking_result = supabase.table("bookings") \
            .select("*") \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not current_booking_result.data:
            logging.warning(f"❌ Booking {booking_id} not found")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        current_booking = current_booking_result.data[0]
        logging.info(f"✅ Current booking found: {current_booking}")
        
        # Get current billing details
        current_billing_result = supabase.table("billing") \
            .select("*") \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not current_billing_result.data:
            logging.warning(f"❌ Billing for booking {booking_id} not found")
            raise HTTPException(status_code=404, detail="Billing record not found")
        
        current_billing = current_billing_result.data[0]
        
        # Prepare update data
        booking_updates = {}
        needs_recalculation = False
        
        # Handle each field update
        if data.first_name is not None:
            booking_updates["first_name"] = data.first_name
        if data.last_name is not None:
            booking_updates["last_name"] = data.last_name
        if data.email is not None:
            booking_updates["email"] = data.email
        if data.phone is not None:
            booking_updates["phone"] = data.phone
        if data.guests is not None:
            booking_updates["guests"] = data.guests
        
        # Handle date and room changes
        new_check_in = current_booking["check_in"]
        new_check_out = current_booking["check_out"]
        new_room_number = current_booking["room_number"]
        new_room_type = current_booking["room_type"]
        
        if data.check_in is not None:
            new_check_in = data.check_in.isoformat()
            booking_updates["check_in"] = new_check_in
            needs_recalculation = True
        
        if data.check_out is not None:
            new_check_out = data.check_out.isoformat()
            booking_updates["check_out"] = new_check_out
            needs_recalculation = True
        
        if data.room_number is not None:
            new_room_number = data.room_number
            booking_updates["room_number"] = new_room_number
            needs_recalculation = True
        
        if data.room_type is not None:
            new_room_type = data.room_type
            booking_updates["room_type"] = new_room_type
            needs_recalculation = True
        
        # Validate dates
        check_in_date = datetime.fromisoformat(new_check_in).date()
        check_out_date = datetime.fromisoformat(new_check_out).date()
        
        if check_in_date >= check_out_date:
            raise HTTPException(status_code=400, detail="Check-in date must be before check-out date")
        
        # Check guest capacity if guests or room type changed
        if data.guests is not None or data.room_type is not None:
            guest_count = data.guests if data.guests is not None else current_booking["guests"]
            room_type_name = new_room_type
            if not check_guest_capacity(room_type_name, guest_count):
                raise HTTPException(status_code=400, detail="Number of guests exceeds room capacity")
        
        # Check room availability if room or dates changed
        if needs_recalculation:
            if not check_room_availability_exclude_booking(new_room_number, check_in_date, check_out_date, booking_id):
                raise HTTPException(status_code=400, detail="Room is not available for the selected dates")
        
        # Recalculate billing if needed
        if needs_recalculation:
            logging.info("💰 Recalculating billing amounts...")
            
            # Get room price
            room_result = supabase.table("rooms_with_details") \
                .select("price") \
                .eq("room_number", new_room_number) \
                .execute()
            
            room_price = room_result.data[0]["price"]
            nights = (check_out_date - check_in_date).days or 1
            
            discount_amount = (room_price * nights) * current_billing["discount"] / 100
            vat_amount = ((room_price * nights) - discount_amount) * current_billing["vat"] / 100
            new_total_amount = (room_price * nights - discount_amount) + vat_amount
            
            logging.info(f"💰 New total amount: {new_total_amount} (Nights: {nights}, Room Price: {room_price})")
        else:
            new_total_amount = current_billing["total_amount"]
        
        # Add update timestamp
        booking_updates["updated_at"] = datetime.utcnow().isoformat()
        booking_updates["is_updated"] = True
        
        # Update booking record
        logging.info("📝 Updating booking record...")
        supabase.table("bookings") \
            .update(booking_updates) \
            .eq("booking_id", booking_id) \
            .execute()
        
        # Update billing if amount changed
        if needs_recalculation:
            logging.info("💳 Updating billing record...")
            billing_updates = {
                "room_price": room_price,
                "total_amount": new_total_amount,
                "updated_at": datetime.utcnow().isoformat()
            }
            supabase.table("billing") \
                .update(billing_updates) \
                .eq("booking_id", booking_id) \
                .execute()
        
        # Update room status if room changed
        if data.room_number is not None and data.room_number != current_booking["room_number"]:
            logging.info("🏨 Updating room statuses...")
            
            # Set old room back to available (if booking is confirmed)
            if current_booking["status"].lower() == "confirmed":
                supabase.table("rooms") \
                    .update({"status": "Available"}) \
                    .eq("room_number", current_booking["room_number"]) \
                    .execute()
                
                # Set new room to occupied
                supabase.table("rooms") \
                    .update({"status": "Occupied"}) \
                    .eq("room_number", new_room_number) \
                    .execute()
        
        logging.info("✅ Booking update completed successfully")
        
        return {
            "message": "Booking updated successfully",
            "booking_id": booking_id,
            "total_amount": new_total_amount,
            "updated_fields": list(booking_updates.keys())
        }
    
    except Exception as e:
        logging.error(f"❗ Error updating booking: {e}")
        
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"Update failed: {str(e)}")

def check_room_availability_exclude_booking(room_number: str, check_in: date, check_out: date, exclude_booking_id: str) -> bool:
    """Check if a room is available for the given date range, excluding a specific booking"""
    try:
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .eq("room_number", room_number) \
            .neq("status", "cancelled") \
            .neq("booking_id", exclude_booking_id) \
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

@router.delete("/cancel-booking/{booking_id}")
def cancel_booking(booking_id: str):
    """Cancel a booking by setting billing.is_cancelled to True instead of deleting"""
    logging.info(f"🗑️ Received cancel request for booking {booking_id}")
    
    try:
        # Get current booking details
        current_booking_result = supabase.table("bookings") \
            .select("*") \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not current_booking_result.data:
            logging.warning(f"❌ Booking {booking_id} not found")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        current_booking = current_booking_result.data[0]
        logging.info(f"✅ Booking found: {current_booking}")
        
        # Update booking status to cancelled
        logging.info("📝 Updating booking status to cancelled...")
        supabase.table("bookings") \
            .update({
                "status": "cancelled",
                "updated_at": datetime.utcnow().isoformat(),
                "is_updated": True
            }) \
            .eq("booking_id", booking_id) \
            .execute()
        
        # Update billing record to mark as cancelled
        logging.info("💳 Marking billing as cancelled...")
        supabase.table("billing") \
            .update({
                "is_cancelled": True,
                "cancelled_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }) \
            .eq("booking_id", booking_id) \
            .execute()
        
        # Update room status back to Available if booking was confirmed
        if current_booking["status"].lower() == "confirmed":
            logging.info(f"🏨 Updating room {current_booking['room_number']} status back to Available...")
            
            supabase.table("rooms") \
                .update({"status": "Available"}) \
                .eq("room_number", current_booking["room_number"]) \
                .execute()
            
            logging.info("✅ Room status updated to Available")
        
        logging.info("✅ Booking cancellation completed successfully")
        
        return {
            "message": "Booking cancelled successfully",
            "booking_id": booking_id,
            "room_number": current_booking["room_number"],
            "room_status_updated": current_booking["status"].lower() == "confirmed"
        }
    
    except Exception as e:
        logging.error(f"❗ Error cancelling booking: {e}")
        
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"Cancel failed: {str(e)}")

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
