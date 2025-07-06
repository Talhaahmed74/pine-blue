from fastapi import APIRouter, HTTPException
from models.room import Room
from supabase_client import supabase

router = APIRouter()

@router.get("/rooms")
def get_rooms():
    try:
        result = supabase.table("rooms").select("*").execute()
        return result.data
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
