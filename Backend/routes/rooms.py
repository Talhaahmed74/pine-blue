from datetime import date, datetime
from fastapi import APIRouter, HTTPException
from models.room import Room, RoomCreate, RoomUpdate
from supabase_client import supabase

router = APIRouter()

def determine_room_status(room_number: str, stored_status: str) -> str:
    """
    Determine the dynamic status of a room based on current bookings.
    Returns 'Occupied' if there's an active booking, otherwise returns the stored status.
    """
    today = date.today()
    
    # Fetch active bookings for this room
    bookings_result = supabase.table("bookings") \
        .select("check_in, check_out") \
        .eq("room_number", room_number) \
        .execute()
    
    if not bookings_result.data:
        return stored_status
    
    # Check if any booking is currently active
    for booking in bookings_result.data:
        try:
            check_in = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
            
            # If today is between check-in and check-out (inclusive of check-in, exclusive of check-out)
            if check_in <= today < check_out:
                return "Occupied"
        except (ValueError, KeyError):
            continue
    
    return stored_status

def check_room_has_active_bookings(room_number: str) -> bool:
    """
    Check if a room has any active bookings (current date falls within booking period).
    """
    today = date.today()
    
    bookings_result = supabase.table("bookings") \
        .select("check_in, check_out") \
        .eq("room_number", room_number) \
        .execute()
    
    if not bookings_result.data:
        return False
    
    for booking in bookings_result.data:
        try:
            check_in = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
            
            if check_in <= today < check_out:
                return True
        except (ValueError, KeyError):
            continue
    
    return False

@router.get("/rooms")
def get_rooms():
    try:
        # Use the view to get complete room information
        rooms_result = supabase.table("rooms_with_details").select("*").execute()
        
        rooms = []
        for room_data in rooms_result.data:
            # Get the stored status from database
            stored_status = room_data["status"]
            
            # Determine dynamic status based on bookings
            dynamic_status = determine_room_status(room_data["room_number"], stored_status)
            
            room = {
                "room_number": room_data["room_number"],
                "room_type": room_data["room_type"],
                "status": dynamic_status,  # Use dynamic status
                "price": int(room_data["price"]) if room_data["price"] else 0,
                "capacity": room_data["capacity"] if room_data["capacity"] else 0,
                "floor": room_data["floor"],
                "amenities": room_data["amenities"] if room_data["amenities"] else []
            }
            
            rooms.append(room)
        
        return rooms
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/rooms/{room_number}")
def get_room(room_number: str):
    try:
        result = supabase.table("rooms_with_details").select("*").eq("room_number", room_number).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Room not found")
        
        room_data = result.data[0]
        stored_status = room_data["status"]
        dynamic_status = determine_room_status(room_number, stored_status)
        
        room = {
            "room_number": room_data["room_number"],
            "room_type": room_data["room_type"],
            "status": dynamic_status,  # Use dynamic status
            "price": int(room_data["price"]) if room_data["price"] else 0,
            "capacity": room_data["capacity"] if room_data["capacity"] else 0,
            "floor": room_data["floor"],
            "amenities": room_data["amenities"] if room_data["amenities"] else []
        }
        
        return room
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms")
def add_room(room_data: dict):
    try:
        # Get room type details by name
        room_type_result = supabase.table("room_types").select("*").eq("name", room_data["room_type"]).execute()
        if not room_type_result.data:
            raise HTTPException(status_code=400, detail="Invalid room type")
        
        room_type = room_type_result.data[0]
        if not room_type["is_available"]:
            raise HTTPException(status_code=400, detail="This room type is not available")
        
        # Check if room number already exists
        existing_room = supabase.table("rooms").select("room_number").eq("room_number", room_data["room_number"]).execute()
        if existing_room.data:
            raise HTTPException(status_code=400, detail="Room number already exists")
        
        # Create room with room_type_id foreign key
        room_insert_data = {
            "room_number": room_data["room_number"],
            "room_type_id": room_type["id"],
            "status": room_data.get("status", "Available"),
            "floor": room_data["floor"]
        }
        
        result = supabase.table("rooms").insert(room_insert_data).execute()
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create room")
        
        return {"message": "Room added successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rooms/{room_number}")
def update_room(room_number: str, room_data: dict):
    try:
        # Fetch current room
        current_room_result = supabase.table("rooms").select("*").eq("room_number", room_number).execute()
        if not current_room_result.data:
            raise HTTPException(status_code=404, detail="Room not found")
        
        current_room = current_room_result.data[0]
        new_status = room_data.get("status")
        
        if new_status and new_status != current_room["status"]:
            # Check if room has active bookings
            has_active_bookings = check_room_has_active_bookings(room_number)
            
            # Get current dynamic status
            current_dynamic_status = determine_room_status(room_number, current_room["status"])
            
            # Validation rules for status changes
            if new_status == "Maintenance":
                if has_active_bookings:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot change status to Maintenance. Room has active bookings. Please wait for the current booking to end or cancel it first."
                    )
                # Only allow changing to Maintenance if room is currently Available (dynamically)
                if current_dynamic_status == "Occupied":
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot change status to Maintenance while room is Occupied. Please wait for the guest to check out."
                    )
            
            # Prevent manual setting to Occupied (should be dynamic only)
            if new_status == "Occupied":
                if not has_active_bookings:
                    raise HTTPException(
                        status_code=400,
                        detail="Cannot manually set room status to Occupied. Room status is automatically set to Occupied when there are active bookings."
                    )
            
            # If changing from any status to Available, ensure no active bookings
            if new_status == "Available" and has_active_bookings:
                raise HTTPException(
                    status_code=400,
                    detail="Cannot change status to Available while room has active bookings."
                )
        
        # Only allow status updates for existing rooms
        update_data = {"status": new_status} if new_status else {}
        
        if update_data:
            supabase.table("rooms").update(update_data).eq("room_number", room_number).execute()
            return {"message": "Room updated successfully"}
        else:
            return {"message": "No changes made"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rooms/{room_number}")
def delete_room(room_number: str):
    try:
        # Check if room has any bookings
        bookings_result = supabase.table("bookings").select("id").eq("room_number", room_number).execute()
        if bookings_result.data:
            raise HTTPException(
                status_code=400,
                detail="Cannot delete room with existing bookings. Please cancel all bookings first."
            )
        
        result = supabase.table("rooms").delete().eq("room_number", room_number).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Room not found")
        
        return {"message": "Room deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
