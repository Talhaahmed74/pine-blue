from fastapi import APIRouter, HTTPException, Query
from models.booking import Booking
from models.booking_request import BookingRequest
from supabase_client import supabase
from supabase import create_client, Client
from datetime import datetime, date
from typing import Optional
import time
import logging
import asyncio

router = APIRouter()
logging.basicConfig(level=logging.INFO)

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s | %(asctime)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

for handler in logging.root.handlers[:]:
    logging.root.removeHandler(handler) 

def generate_booking_id(last_id: int) -> str:
    return f"BK{str(last_id + 1).zfill(3)}"

def check_room_availability(room_number: str, check_in: date, check_out: date) -> bool:
    """Check if a room is available for the given date range"""
    try:
        # Get all bookings for this room that might overlap
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .eq("room_number", room_number) \
            .neq("status", "cancelled") \
            .execute()

        for booking in overlapping_result.data:
            b_check_in = datetime.fromisoformat(booking["check_in"]).date()
            b_check_out = datetime.fromisoformat(booking["check_out"]).date()

            # Check if dates overlap
            if not (b_check_out <= check_in or b_check_in >= check_out):
                return False  # Room is not available due to overlapping booking

        return True  # Room is available
    except Exception as e:
        logging.error(f"Error checking room availability: {e}")
        return False

@router.post("/book-room")
async def book_room(data: BookingRequest):

    logging.info("📥 Received booking request")

    booking_data = data.booking
    billing_data = data.billing

    inserted_booking_str_id = None
    room_status_updated = False

    try:
        logging.info(f"🔎 Checking room availability for room {booking_data.room_number}")
        
        # Check if room exists and is not under maintenance
        room_result = supabase.table("rooms").select("room_type, room_number, price, status")\
            .eq("room_number", booking_data.room_number).execute()

        if not room_result.data:
            logging.warning(f"❌ Room {booking_data.room_number} not found")
            raise HTTPException(status_code=404, detail="Room not found")

        room = room_result.data[0]
        logging.info(f"✅ Room found: {room}")

        if room["status"].lower() == "maintenance":
            logging.warning("❌ Room is under maintenance")
            raise HTTPException(status_code=400, detail="Room is under maintenance")

        if not check_room_availability(booking_data.room_number, booking_data.check_in, booking_data.check_out):
            logging.warning("❌ Room is not available for the selected dates")
            raise HTTPException(status_code=400, detail="Room is not available for the selected dates")

        logging.info("✅ Room is available for the selected dates")

        # 💰 Calculate total
        nights = (booking_data.check_out - booking_data.check_in).days or 1
        room_price = room["price"]
        discount_amount = (room_price * nights) * billing_data.discount / 100
        vat_amount = ((room_price * nights) - discount_amount) * billing_data.vat / 100
        total_amount = (room_price * nights - discount_amount) + vat_amount

        logging.info(f"💰 Total: {total_amount} (Nights: {nights}, Price/Night: {room_price})")

        # 🆔 Generate booking ID
        last_booking = supabase.table("bookings").select("booking_id").order("id", desc=True).limit(1).execute()
        last_id = int(last_booking.data[0]["booking_id"][2:]) if last_booking.data else 0
        booking_id = generate_booking_id(last_id)
        logging.info(f"🆕 Booking ID: {booking_id}")

        # 📦 Insert booking
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
            "created_at": datetime.utcnow().isoformat()
        }, returning="representation").execute()
        inserted_booking_str_id = booking_id
        logging.info("✅ Booking saved")

        # 💳 Insert billing
        supabase.table("billing").insert({
            "booking_id": booking_id,
            "room_price": room_price,
            "discount": billing_data.discount,
            "vat": billing_data.vat,
            "total_amount": total_amount,
            "payment_method": billing_data.payment_method,
            "payment_status": billing_data.payment_status,
            "created_at": datetime.utcnow().isoformat()
        }).execute()
        logging.info("✅ Billing saved")

        # 🏨 Update room status if confirmed
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
    check_out: date = Query(...)
):
    try:
        # ✅ Step 1: Get all rooms of this type that are NOT in Maintenance
        all_rooms_result = supabase.table("rooms") \
            .select("room_number") \
            .eq("room_type", room_type) \
            .neq("status", "Maintenance") \
            .execute()

        all_room_numbers = [room["room_number"] for room in all_rooms_result.data]

        if not all_room_numbers:
            return {"available_rooms": []}

        # ✅ Step 2: Get all bookings that overlap with given date range
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .in_("room_number", all_room_numbers) \
            .neq("status", "cancelled") \
            .execute()

        unavailable = set()
        for booking in overlapping_result.data:
            b_check_in = datetime.fromisoformat(booking["check_in"]).date()
            b_check_out = datetime.fromisoformat(booking["check_out"]).date()

            # ✅ Overlap condition
            if not (b_check_out <= check_in or b_check_in >= check_out):
                unavailable.add(booking["room_number"])

        # ✅ Step 3: Filter out unavailable rooms
        available_rooms = [r for r in all_room_numbers if r not in unavailable]

        return {"available_rooms": available_rooms}

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching rooms: {str(e)}")

@router.put("/update-booking/{booking_id}")
def update_booking(booking_id: str, data: dict):
    """
    Update booking details. Only allows updates to:
    - Personal info: first_name, last_name, email, phone, guests
    - Booking details: check_in, check_out, room_number, room_type
    - Recalculates total amount if dates or room type change
    """
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
        logging.info(f"✅ Current billing found: {current_billing}")
        
        # Define allowed fields for update
        allowed_booking_fields = {
            'first_name', 'last_name', 'email', 'phone', 'guests',
            'check_in', 'check_out', 'room_number', 'room_type'
        }
        
        # Filter out disallowed fields
        booking_updates = {k: v for k, v in data.items() if k in allowed_booking_fields}
        
        if not booking_updates:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        # Check if dates or room details changed (requires recalculation)
        needs_recalculation = False
        old_check_in = datetime.fromisoformat(current_booking["check_in"]).date()
        old_check_out = datetime.fromisoformat(current_booking["check_out"]).date()
        old_room_number = current_booking["room_number"]
        old_room_type = current_booking["room_type"]
        
        new_check_in = old_check_in
        new_check_out = old_check_out
        new_room_number = old_room_number
        new_room_type = old_room_type
        
        if 'check_in' in booking_updates:
            new_check_in = datetime.fromisoformat(booking_updates['check_in']).date() if isinstance(booking_updates['check_in'], str) else booking_updates['check_in']
            needs_recalculation = True
            
        if 'check_out' in booking_updates:
            new_check_out = datetime.fromisoformat(booking_updates['check_out']).date() if isinstance(booking_updates['check_out'], str) else booking_updates['check_out']
            needs_recalculation = True
            
        if 'room_number' in booking_updates:
            new_room_number = booking_updates['room_number']
            needs_recalculation = True
            
        if 'room_type' in booking_updates:
            new_room_type = booking_updates['room_type']
            needs_recalculation = True
        
        # Validate check-in is before check-out
        if new_check_in >= new_check_out:
            raise HTTPException(status_code=400, detail="Check-in date must be before check-out date")
        
        # If room changed, check if new room exists and is available
        if new_room_number != old_room_number:
            # Check if new room exists
            room_result = supabase.table("rooms") \
                .select("room_type, room_number, price, status") \
                .eq("room_number", new_room_number) \
                .execute()
            
            if not room_result.data:
                raise HTTPException(status_code=404, detail=f"Room {new_room_number} not found")
            
            room = room_result.data[0]
            
            # Check if room is in maintenance
            if room["status"].lower() == "maintenance":
                raise HTTPException(status_code=400, detail="New room is under maintenance")
            
            # Check availability for new room (excluding current booking)
            if not check_room_availability_exclude_booking(new_room_number, new_check_in, new_check_out, booking_id):
                raise HTTPException(status_code=400, detail="New room is not available for the selected dates")
        
        # If dates changed, check availability for the room
        elif (new_check_in != old_check_in or new_check_out != old_check_out):
            if not check_room_availability_exclude_booking(new_room_number, new_check_in, new_check_out, booking_id):
                raise HTTPException(status_code=400, detail="Room is not available for the new dates")
        
        # Recalculate billing if needed
        new_total_amount = current_billing["total_amount"]
        if needs_recalculation:
            logging.info("💰 Recalculating billing amounts...")
            
            # Get room price (use new room if changed)
            room_result = supabase.table("rooms") \
                .select("price") \
                .eq("room_number", new_room_number) \
                .execute()
            
            room_price = room_result.data[0]["price"]
            nights = (new_check_out - new_check_in).days or 1
            
            discount_amount = (room_price * nights) * current_billing["discount"] / 100
            vat_amount = ((room_price * nights) - discount_amount) * current_billing["vat"] / 100
            new_total_amount = (room_price * nights - discount_amount) + vat_amount
            
            logging.info(f"💰 New total amount: {new_total_amount} (Nights: {nights}, Room Price: {room_price})")
        
        # Prepare updates for database
        if 'check_in' in booking_updates:
            booking_updates['check_in'] = new_check_in.isoformat()
        if 'check_out' in booking_updates:
            booking_updates['check_out'] = new_check_out.isoformat()
        
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
                "total_amount": new_total_amount
            }
            supabase.table("billing") \
                .update(billing_updates) \
                .eq("booking_id", booking_id) \
                .execute()
        
        # Update room status if room changed
        if new_room_number != old_room_number:
            logging.info("🏨 Updating room statuses...")
            
            # Set old room back to available (if booking is confirmed)
            if current_booking["status"].lower() == "confirmed":
                supabase.table("rooms") \
                    .update({"status": "Available"}) \
                    .eq("room_number", old_room_number) \
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
        # Get all bookings for this room that might overlap, excluding the current booking
        overlapping_result = supabase.table("bookings") \
            .select("room_number", "check_in", "check_out", "status") \
            .eq("room_number", room_number) \
            .neq("status", "cancelled") \
            .neq("booking_id", exclude_booking_id) \
            .execute()

        for booking in overlapping_result.data:
            b_check_in = datetime.fromisoformat(booking["check_in"]).date()
            b_check_out = datetime.fromisoformat(booking["check_out"]).date()

            # Check if dates overlap
            if not (b_check_out <= check_in or b_check_in >= check_out):
                return False  # Room is not available due to overlapping booking

        return True  # Room is available
    except Exception as e:
        logging.error(f"Error checking room availability: {e}")
        return False

@router.delete("/delete-booking/{booking_id}")
def delete_booking(booking_id: str):
    """
    Delete a booking by booking_id.
    This will:
    1. Delete the booking record
    2. Delete associated billing record
    3. Update room status back to Available if booking was confirmed
    """
    logging.info(f"🗑️ Received delete request for booking {booking_id}")
    
    try:
        # Get current booking details to check status and room info
        current_booking_result = supabase.table("bookings") \
            .select("*") \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not current_booking_result.data:
            logging.warning(f"❌ Booking {booking_id} not found")
            raise HTTPException(status_code=404, detail="Booking not found")
        
        current_booking = current_booking_result.data[0]
        logging.info(f"✅ Booking found: {current_booking}")
        
        # Store booking details for cleanup
        room_number = current_booking["room_number"]
        booking_status = current_booking["status"]
        
        # Delete billing record first (foreign key constraint)
        logging.info("💳 Deleting billing record...")
        billing_delete_result = supabase.table("billing") \
            .delete() \
            .eq("booking_id", booking_id) \
            .execute()
        
        if billing_delete_result.data:
            logging.info("✅ Billing record deleted successfully")
        else:
            logging.warning("⚠️ No billing record found to delete")
        
        # Delete booking record
        logging.info("📝 Deleting booking record...")
        booking_delete_result = supabase.table("bookings") \
            .delete() \
            .eq("booking_id", booking_id) \
            .execute()
        
        if not booking_delete_result.data:
            logging.warning("❌ Failed to delete booking record")
            raise HTTPException(status_code=500, detail="Failed to delete booking")
        
        logging.info("✅ Booking record deleted successfully")
        
        # Update room status back to Available if booking was confirmed
        if booking_status.lower() == "confirmed":
            logging.info(f"🏨 Updating room {room_number} status back to Available...")
            
            room_update_result = supabase.table("rooms") \
                .update({"status": "Available"}) \
                .eq("room_number", room_number) \
                .execute()
            
            if room_update_result.data:
                logging.info("✅ Room status updated to Available")
            else:
                logging.warning("⚠️ Failed to update room status")
        else:
            logging.info(f"ℹ️ Booking status was '{booking_status}', no room status update needed")
        
        logging.info("✅ Booking deletion completed successfully")
        
        return {
            "message": "Booking deleted successfully",
            "booking_id": booking_id,
            "room_number": room_number,
            "room_status_updated": booking_status.lower() == "confirmed"
        }
        
    except Exception as e:
        logging.error(f"❗ Error deleting booking: {e}")
        
        if isinstance(e, HTTPException):
            raise e
        else:
            raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")