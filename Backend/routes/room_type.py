from datetime import datetime
from fastapi import APIRouter, HTTPException
from typing import List
from models.rtype import RoomType, RoomTypeCreate, RoomTypeUpdate, RoomTypeResponse
from supabase_client import supabase

router = APIRouter()

@router.get("/room-types", response_model=List[RoomTypeResponse])
def get_room_types():
    """Get all room types with calculated total capacity"""
    try:
        result = supabase.table("room_types").select("*").execute()
        room_types = []
        
        for room_type in result.data:
            room_type_response = RoomTypeResponse(
                **room_type,
                total_capacity=room_type["max_adults"] + room_type["max_children"]
            )
            room_types.append(room_type_response)
        
        return room_types
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/room-types/available", response_model=List[RoomTypeResponse])
def get_available_room_types_for_booking():
    """Get available room types for customer booking with pricing"""
    try:
        result = supabase.table("room_types").select("*").eq("is_available", True).execute()
        room_types = []
        
        for room_type in result.data:
            room_type_response = RoomTypeResponse(
                **room_type,
                total_capacity=room_type["max_adults"] + room_type["max_children"]
            )
            room_types.append(room_type_response)
        
        return room_types
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/room-types/available-for-booking", response_model=dict)
def get_available_room_types_for_featured_rooms():
    """Get all room types (available and unavailable) for featured rooms display"""
    try:
        result = supabase.table("room_types").select("*").execute()
        room_types = []
        
        for room_type in result.data:
            room_type_response = RoomTypeResponse(
                **room_type,
                total_capacity=room_type["max_adults"] + room_type["max_children"]
            )
            room_types.append(room_type_response)
        
        return {"room_types": room_types}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/room-types/{room_type_id}", response_model=RoomTypeResponse)
def get_room_type(room_type_id: int):
    """Get a specific room type by ID"""
    try:
        result = supabase.table("room_types").select("*").eq("id", room_type_id).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = result.data[0]
        return RoomTypeResponse(
            **room_type,
            total_capacity=room_type["max_adults"] + room_type["max_children"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/room-types", response_model=RoomTypeResponse)
def create_room_type(room_type: RoomTypeCreate):
    """Create a new room type"""
    try:
        # Check if room type name already exists
        existing = supabase.table("room_types").select("id").eq("name", room_type.name).execute()
        if existing.data:
            raise HTTPException(status_code=400, detail="Room type with this name already exists")
        
        # Insert new room type
        result = supabase.table("room_types").insert({
            "name": room_type.name,
            "base_price": room_type.base_price,
            "is_available": room_type.is_available,
            "amenities": room_type.amenities,
            "max_adults": room_type.max_adults,
            "max_children": room_type.max_children
        }).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create room type")
        
        created_room_type = result.data[0]
        return RoomTypeResponse(
            **created_room_type,
            total_capacity=created_room_type["max_adults"] + created_room_type["max_children"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/room-types/{room_type_id}", response_model=RoomTypeResponse)
def update_room_type(room_type_id: int, room_type_update: RoomTypeUpdate):
    """Update a room type"""
    try:
        # Check if room type exists
        existing_result = supabase.table("room_types").select("*").eq("id", room_type_id).execute()
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        existing_room_type = existing_result.data[0]
        
        # If trying to set is_available to False, check if there are rooms using this room type
        if room_type_update.is_available is False and existing_room_type["is_available"]:
            rooms_result = supabase.table("rooms").select("id").eq("room_type_id", room_type_id).execute()
            if rooms_result.data:
                raise HTTPException(
                    status_code=400, 
                    detail="Cannot disable room type. There are existing rooms using this room type."
                )
        
        # Check if name is being changed and if new name already exists
        if room_type_update.name and room_type_update.name != existing_room_type["name"]:
            name_check = supabase.table("room_types").select("id").eq("name", room_type_update.name).execute()
            if name_check.data:
                raise HTTPException(status_code=400, detail="Room type with this name already exists")
        
        # Prepare update data
        update_data = {}
        if room_type_update.name is not None:
            update_data["name"] = room_type_update.name
        if room_type_update.base_price is not None:
            update_data["base_price"] = room_type_update.base_price
        if room_type_update.is_available is not None:
            update_data["is_available"] = room_type_update.is_available
        if room_type_update.amenities is not None:
            update_data["amenities"] = room_type_update.amenities
        if room_type_update.max_adults is not None:
            update_data["max_adults"] = room_type_update.max_adults
        if room_type_update.max_children is not None:
            update_data["max_children"] = room_type_update.max_children
        
        # Add updated_at timestamp
        update_data["updated_at"] = datetime.now().isoformat()
        
        # Update room type
        result = supabase.table("room_types").update(update_data).eq("id", room_type_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to update room type")
        
        updated_room_type = result.data[0]
        return RoomTypeResponse(
            **updated_room_type,
            total_capacity=updated_room_type["max_adults"] + updated_room_type["max_children"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/room-types/{room_type_id}")
def delete_room_type(room_type_id: int):
    """Delete a room type"""
    try:
        # Check if room type exists
        existing_result = supabase.table("room_types").select("name").eq("id", room_type_id).execute()
        if not existing_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        # Check if there are rooms using this room type
        rooms_result = supabase.table("rooms").select("id").eq("room_type_id", room_type_id).execute()
        if rooms_result.data:
            raise HTTPException(
                status_code=400, 
                detail="Cannot delete room type. There are existing rooms using this room type."
            )
        
        # Delete room type
        supabase.table("room_types").delete().eq("id", room_type_id).execute()
        
        return {"message": "Room type deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
