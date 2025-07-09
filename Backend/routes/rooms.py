from datetime import date, datetime
from fastapi import APIRouter, HTTPException
from models.room import Room, RoomCreate, RoomUpdate
from supabase_client import supabase

router = APIRouter()

def determine_room_status(room_number: str, bookings: list) -> str:
    today = date.today()
    if not bookings:
        return "Available"
    
    bookings.sort(key=lambda b: b.get("check_in", ""))
    for booking in bookings:
        try:
            check_in = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue
        
        if check_in <= today < check_out:
            return "Occupied"
    
    return "Available"

@router.get("/rooms")
def get_rooms():
    try:
        # Use the view to get complete room information
        rooms_result = supabase.table("rooms_with_details").select("*").execute()
        
        rooms = []
        for room_data in rooms_result.data:
            room = {
                "room_number": room_data["room_number"],
                "room_type": room_data["room_type"],
                "status": room_data["status"],
                "price": int(room_data["price"]) if room_data["price"] else 0,
                "capacity": room_data["capacity"] if room_data["capacity"] else 0,
                "floor": room_data["floor"],
                "amenities": room_data["amenities"] if room_data["amenities"] else []
            }
            
            # Update room status based on bookings
            room_number = room["room_number"]
            bookings_result = supabase.table("bookings") \
                .select("check_in, check_out") \
                .eq("room_number", room_number) \
                .execute()
            bookings = bookings_result.data
            current_status = determine_room_status(room_number, bookings)
            
            if current_status != room_data["status"]:
                supabase.table("rooms") \
                    .update({"status": current_status}) \
                    .eq("room_number", room_number) \
                    .execute()
                room["status"] = current_status
            
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
        room = {
            "room_number": room_data["room_number"],
            "room_type": room_data["room_type"],
            "status": room_data["status"],
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
        
        # Status update restrictions
        new_status = room_data.get("status")
        if new_status and new_status != current_room["status"]:
            # Can't change to maintenance if currently occupied
            if current_room["status"] == "Occupied" and new_status == "Maintenance":
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot change status to Maintenance while room is Occupied. Please remove the active booking first."
                )
            
            # Can't change from occupied to anything except available (through booking system)
            if current_room["status"] == "Occupied" and new_status != "Available":
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot update an occupied room. Please remove the active booking first."
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
