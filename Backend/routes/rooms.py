from datetime import date, datetime
from fastapi import APIRouter, HTTPException
from models.room import Room
from supabase_client import supabase

router = APIRouter()

def determine_room_status(room_number: str, bookings: list) -> str:
    today = date.today()

    if not bookings:
        return "Available"

    bookings.sort(key=lambda b: b.get("check_in", ""))  # sort to prioritize earlier bookings

    for booking in bookings:
        try:
            check_in = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue

        # Room is currently in use
        if check_in <= today < check_out:
            return "Occupied"

    # Not occupied today = Available
    return "Available"

@router.get("/rooms")
def get_rooms():
    try:
        rooms_result = supabase.table("rooms").select("*").execute()
        rooms = rooms_result.data

        for room in rooms:
            room_number = room["room_number"]

            bookings_result = supabase.table("bookings") \
                .select("check_in, check_out") \
                .eq("room_number", room_number) \
                .execute()
            bookings = bookings_result.data

            current_status = determine_room_status(room_number, bookings)

            # Only update in DB if the status changed
            if current_status != room["status"]:
                supabase.table("rooms") \
                    .update({"status": current_status}) \
                    .eq("room_number", room_number) \
                    .execute()
                room["status"] = current_status

        return rooms

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms/{room_number}")
def get_room(room_number: str):
    try:
        result = supabase.table("rooms").select("*").eq("room_number", room_number).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Room not found")
        return result.data[0]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/rooms")
def add_room(room: Room):
    try:
        supabase.table("rooms").insert(room.dict()).execute()
        return {"message": "Room added"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/rooms/{room_number}")
def update_room(room_number: str, room: Room):
    try:
        supabase.table("rooms").update(room.dict()).eq("room_number", room_number).execute()
        return {"message": "Room updated"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/rooms/{room_number}")
def delete_room(room_number: str):
    try:
        supabase.table("rooms").delete().eq("room_number", room_number).execute()
        return {"message": "Room deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
