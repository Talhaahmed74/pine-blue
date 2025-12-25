# routes/availability_routes.py - Complete with all endpoints
from fastapi import APIRouter, HTTPException, Query
from supabase_client import supabase
from datetime import datetime, date, timedelta, timezone
from typing import List
import logging
import asyncio
from utils.cache_helper import CacheManager

router = APIRouter()
logging.basicConfig(level=logging.INFO)

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

# ============================================
# HELPER: ROOM AVAILABILITY CHECK
# ============================================

async def check_room_availability(room_number: str, check_in: date, check_out: date) -> bool:
    """Check if a room is available for the given date range (PKT-aware)."""
    try:
        room_result = await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .select("status")
            .eq("room_number", room_number)
            .execute()
        )
        
        if not room_result.data:
            return False
        
        room_status = room_result.data[0]["status"]
        
        if room_status == "Maintenance":
            return False
        
        pkt_today = get_pkt_today()
        
        bookings_result = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("check_in, check_out, status")
            .eq("room_number", room_number)
            .eq("is_cancelled", False)
            .execute()
        )
        
        for booking in bookings_result.data:
            booking_check_in = date.fromisoformat(booking["check_in"]) if isinstance(booking["check_in"], str) else booking["check_in"]
            booking_check_out = date.fromisoformat(booking["check_out"]) if isinstance(booking["check_out"], str) else booking["check_out"]
            
            if check_in < booking_check_out and check_out > booking_check_in:
                logging.info(f"❌ Room {room_number} has overlapping booking: {booking_check_in} to {booking_check_out}")
                return False
            
            if pkt_today >= booking_check_in and pkt_today < booking_check_out:
                logging.info(f"❌ Room {room_number} is currently occupied")
                return False
        
        return True
        
    except Exception as e:
        logging.error(f"Error checking availability for {room_number}: {e}")
        return False

# ============================================
# HELPER: GET AVAILABLE ROOMS (OPTIMIZED)
# ============================================

async def get_available_rooms_optimized(room_type_id: int, check_in: date, check_out: date) -> List[dict]:
    """Get available rooms for a room type (optimized with single queries)."""
    try:
        room_type_result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("name")
            .eq("id", room_type_id)
            .execute()
        )
        
        if not room_type_result.data:
            return []
        
        room_type_name = room_type_result.data[0]["name"]
        
        rooms_result = await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .select("room_number, room_type, room_type_id, status")
            .eq("room_type_id", room_type_id)
            .neq("status", "Maintenance")
            .execute()
        )
        
        if not rooms_result.data:
            return []
        
        room_numbers = [r["room_number"] for r in rooms_result.data]
        bookings_result = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("room_number, check_in, check_out, status")
            .in_("room_number", room_numbers)
            .eq("is_cancelled", False)
            .gte("check_out", check_in.isoformat())
            .lte("check_in", check_out.isoformat())
            .execute()
        )
        
        occupied_rooms = set()
        pkt_today = get_pkt_today()
        
        for booking in bookings_result.data:
            booking_check_in = date.fromisoformat(booking["check_in"]) if isinstance(booking["check_in"], str) else booking["check_in"]
            booking_check_out = date.fromisoformat(booking["check_out"]) if isinstance(booking["check_out"], str) else booking["check_out"]
            
            if check_in < booking_check_out and check_out > booking_check_in:
                occupied_rooms.add(booking["room_number"])
            elif pkt_today >= booking_check_in and pkt_today < booking_check_out:
                occupied_rooms.add(booking["room_number"])
        
        available_rooms = [
            {
                "room_number": room["room_number"],
                "room_type": room.get("room_type") or room_type_name,
                "room_type_id": room["room_type_id"],
                "status": room["status"]
            }
            for room in rooms_result.data
            if room["room_number"] not in occupied_rooms
        ]
        
        return available_rooms
        
    except Exception as e:
        logging.error(f"Error getting available rooms: {e}")
        return []

# ============================================
# ENDPOINT: AVAILABLE ROOM TYPES (CUSTOMER)
# ============================================

@router.get("/room-types/available-for-booking")
async def get_available_room_types_for_booking():
    """
    Get all available room types (customer view).
    Shows room types that are marked as available in the system.
    """
    cache_key = "available_room_types_for_booking"
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .eq("is_available", True)
            .execute()
        )
        
        room_types = []
        for room_type in result.data:
            max_adults = room_type.get("max_adults", 2)
            max_children = room_type.get("max_children", 1)
            
            rooms_count_result = await asyncio.to_thread(
                lambda: supabase.table("rooms")
                .select("room_number", count="exact")
                .eq("room_type_id", room_type["id"])
                .neq("status", "Maintenance")
                .execute()
            )
            
            total_rooms = rooms_count_result.count or 0
            
            room_types.append({
                "id": room_type["id"],
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "max_adults": max_adults,
                "max_children": max_children,
                "total_capacity": max_adults + max_children,
                "amenities": room_type.get("amenities", []),
                "total_rooms_count": total_rooms,
                "description": room_type.get("description", ""),
                "image_url": room_type.get("image_url", ""),
                "is_available": True,
                "created_at": room_type.get("created_at", ""),
                "updated_at": room_type.get("updated_at")
            })
        
        CacheManager.set_cache(cache_key, room_types, 900)
        return room_types
        
    except Exception as e:
        logging.error(f"Error getting available room types: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINT: AVAILABLE ROOM TYPES (ADMIN)
# ============================================

@router.get("/room-types/available")
async def get_available_room_types_for_admin(
    check_in: date = Query(...),
    check_out: date = Query(...)
):
    """Get room types with available rooms for admin (shows all room types)."""
    cache_key = f"admin_room_types:{check_in.isoformat()}:{check_out.isoformat()}"
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .execute()
        )
        
        room_types = []
        for room_type in result.data:
            available_rooms = await get_available_rooms_optimized(
                room_type["id"], check_in, check_out
            )
            
            max_adults = room_type.get("max_adults", 2)
            max_children = room_type.get("max_children", 1)
            
            room_types.append({
                "id": room_type["id"],
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "max_adults": max_adults,
                "max_children": max_children,
                "total_capacity": max_adults + max_children,
                "amenities": room_type.get("amenities", []),
                "available_rooms_count": len(available_rooms),
                "description": room_type.get("description", ""),
                "image_url": room_type.get("image_url", ""),
                "is_available": len(available_rooms) > 0
            })
        
        CacheManager.set_cache(cache_key, room_types, CacheManager.AVAILABILITY_TTL)
        return room_types
        
    except Exception as e:
        logging.error(f"Error getting room types for admin: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINT: AVAILABLE ROOMS BY TYPE NAME
# ============================================

@router.get("/available-rooms/{room_type}")
async def get_available_rooms(
    room_type: str,
    check_in: date = Query(...),
    check_out: date = Query(...)
):
    """Get available rooms for a specific room type name and date range"""
    cache_key = CacheManager.ROOM_AVAILABILITY_KEY.format(
        room_type=room_type,
        check_in=check_in.isoformat(),
        check_out=check_out.isoformat()
    )
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        logging.info(f"🔍 Checking available rooms for '{room_type}' from {check_in} to {check_out}")
        
        room_type_result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("id, base_price, amenities, max_adults, max_children")
            .ilike("name", room_type)
            .single()
            .execute()
        )
        
        if not room_type_result.data:
            logging.warning(f"Room type not found: {room_type}")
            return {"available_rooms": []}
        
        rt_info = room_type_result.data
        
        available_rooms = await get_available_rooms_optimized(
            room_type_id=rt_info["id"],
            check_in=check_in,
            check_out=check_out
        )
        
        detailed_rooms = [{
            "room_number": room["room_number"],
            "room_type": room["room_type"],
            "price": rt_info["base_price"],
            "capacity": rt_info.get("max_adults", 2) + rt_info.get("max_children", 1),
            "amenities": rt_info.get("amenities", [])
        } for room in available_rooms]
        
        result = {"available_rooms": detailed_rooms}
        CacheManager.set_cache(cache_key, result, CacheManager.AVAILABILITY_TTL)
        
        logging.info(f"Found {len(detailed_rooms)} available rooms")
        return result
        
    except Exception as e:
        logging.error(f"Error fetching available rooms: {e}")
        raise HTTPException(status_code=500, detail=f"Error fetching rooms: {str(e)}")

# ============================================
# ENDPOINT: ROOM TYPES WITH CURRENT AVAILABILITY
# ============================================

@router.get("/room-types-with-availability")
async def get_room_types_with_availability():
    """Get all room types with their current availability status (for today/tomorrow in PKT)"""
    cache_key = "room_types_with_availability"
    cached_data = CacheManager.get_cache(cache_key)
    if cached_data:
        return cached_data
    
    try:
        pkt_today = get_pkt_today()
        pkt_tomorrow = pkt_today + timedelta(days=1)
        
        result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .execute()
        )
        
        room_types = []
        for room_type in result.data:
            available_rooms = await get_available_rooms_optimized(
                room_type_id=room_type["id"],
                check_in=pkt_today,
                check_out=pkt_tomorrow
            )
            
            total_rooms_result = await asyncio.to_thread(
                lambda: supabase.table("rooms")
                .select("room_number, status")
                .eq("room_type_id", room_type["id"])
                .execute()
            )
            
            rooms_data = total_rooms_result.data or []
            total_rooms_count = len(rooms_data)
            
            available_count = len([r for r in rooms_data if r["status"] == "Available"])
            booked_count = len([r for r in rooms_data if r["status"] == "Booked"])
            occupied_count = len([r for r in rooms_data if r["status"] == "Occupied"])
            maintenance_count = len([r for r in rooms_data if r["status"] == "Maintenance"])
            
            max_adults = room_type.get("max_adults", 2)
            max_children = room_type.get("max_children", 1)
            
            room_types.append({
                "id": room_type["id"],
                "name": room_type["name"],
                "base_price": room_type["base_price"],
                "is_available": len(available_rooms) > 0,
                "available_rooms_count": len(available_rooms),
                "total_rooms_count": total_rooms_count,
                "status_breakdown": {
                    "available": available_count,
                    "booked": booked_count,
                    "occupied": occupied_count,
                    "maintenance": maintenance_count
                },
                "max_adults": max_adults,
                "max_children": max_children,
                "total_capacity": max_adults + max_children,
                "amenities": room_type.get("amenities", [])
            })
        
        CacheManager.set_cache(cache_key, room_types, CacheManager.AVAILABILITY_TTL)
        return room_types
        
    except Exception as e:
        logging.error(f"Error getting room types with availability: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================
# ENDPOINT: GET ROOM TYPE BY ID ⭐ THIS WAS MISSING!
# ============================================

@router.get("/room_types/{room_type_id}")
async def get_room_type_by_id(room_type_id: int):
    """
    Get full room type details by ID.
    Used by the booking page to display room information.
    """
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .eq("id", room_type_id)
            .single()
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        return result.data
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching room type by ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch room type")