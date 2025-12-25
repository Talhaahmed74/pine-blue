from datetime import date, datetime
from fastapi import APIRouter, HTTPException, Query
from routes.notifications import trigger_room_status_changed
from supabase_client import supabase
from utils.cache_helper import CacheManager
from typing import Optional

router = APIRouter()

def determine_room_status(room_number: str, stored_status: str) -> str:
    """
    Determine the dynamic status of a room based on current active bookings.
    Returns 'Occupied' only if there's a booking active today (not cancelled).
    """
    today = date.today()
    
    bookings_result = supabase.table("bookings") \
        .select("check_in, check_out") \
        .eq("room_number", room_number) \
        .eq("is_cancelled", False) \
        .execute()

    for booking in bookings_result.data or []:
        try:
            check_in = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            check_out = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
            if check_in <= today < check_out:
                return "Occupied"
        except Exception:
            continue
    return stored_status

def check_room_has_active_bookings(room_number: str) -> bool:
    """
    Returns True if there is any *current* non-cancelled booking for this room.
    """
    today = date.today()
    
    bookings_result = supabase.table("bookings") \
        .select("check_in, check_out") \
        .eq("room_number", room_number) \
        .eq("is_cancelled", False) \
        .execute()

    for booking in bookings_result.data or []:
        try:
            ci = datetime.strptime(booking["check_in"], "%Y-%m-%d").date()
            co = datetime.strptime(booking["check_out"], "%Y-%m-%d").date()
            if ci <= today < co:
                return True
        except Exception:
            continue
    return False

@router.get("/rooms/stats")
def get_room_stats_simple():
    """
    Fetch room statistics with DYNAMIC status calculation.
    This ensures stats reflect the actual current status (including occupied rooms from bookings).
    """
    # Try to get from cache first
    cache_key = CacheManager.ROOM_STATS_KEY
    cached = CacheManager.get_cache(cache_key)
    if cached:
        return cached
    
    try:
        rooms_data = supabase.table("rooms_with_details").select("room_number, status").execute().data or []
        stats = {"total": len(rooms_data), "available": 0, "occupied": 0, "maintenance": 0}

        for r in rooms_data:
            status = determine_room_status(r["room_number"], r["status"])
            if status == "Available":
                stats["available"] += 1
            elif status == "Occupied":
                stats["occupied"] += 1
            elif status == "Maintenance":
                stats["maintenance"] += 1

        CacheManager.set_cache(cache_key, stats, 600)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/rooms")
def get_rooms(
    limit: int = Query(8, ge=1), 
    offset: int = Query(0, ge=0),
    status: str = Query(None, description="Filter by room status: Available, Occupied, or Maintenance")
):
    """
    Get rooms with optional status filtering and pagination.
    
    - If status is provided, fetch all rooms with that status (ignores pagination when filtering)
    - If no status, use normal pagination
    """
    
    # Create cache key based on whether we're filtering or paginating
    cache_key = f"rooms_list:{status or 'all'}:{offset}:{limit}"
    cached = CacheManager.get_cache(cache_key)
    if cached:
        return cached

    try:
        query = supabase.table("rooms_with_details").select("*", count="exact")
        data = query.execute().data or []

        rooms = []
        for rd in data:
            dynamic_status = determine_room_status(rd["room_number"], rd["status"])
            if status and dynamic_status != status:
                continue
            rooms.append({
                "room_id": rd["room_id"],
                "room_number": rd["room_number"],
                "room_type": rd["room_type"],
                "status": dynamic_status,
                "price": int(rd.get("price") or 0),
                "capacity": rd.get("capacity") or 0,
                "floor": rd["floor"],
                "amenities": rd.get("amenities") or []
            })

        if not status:
            rooms = rooms[offset:offset + limit]
        result = {"rooms": rooms, "total_count": len(data)}

        CacheManager.set_cache(cache_key, result, CacheManager.DEFAULT_TTL)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    

@router.get("/rooms/search")
def search_rooms(query: str):
    try:
        # Normalize query and small TTL (search results change frequently)
        norm_q = query.strip().lower()
        if not norm_q:
            return []

        cache_key = f"room_search:{norm_q}"
        cached_result = CacheManager.get_cache(cache_key)
        if cached_result:
            return cached_result

        # Limit search results to avoid huge payloads and many DB round-trips
        rooms_result = (
            supabase.table("rooms_with_details")
            .select("*")
            .ilike("room_number", f"%{query}%")
            .limit(35)
            .execute()
        )

        rows = rooms_result.data or []
        if not rows:
            return []

        # Batch fetch bookings for all matched rooms to compute dynamic status in one go
        room_numbers = [r["room_number"] for r in rows]
        bookings_result = (
            supabase.table("bookings")
            .select("room_number, check_in, check_out")
            .in_("room_number", room_numbers)
            .eq("is_cancelled", False)
            .execute()
        )
        bookings_by_room = {}
        for b in bookings_result.data or []:
            rn = b.get("room_number")
            bookings_by_room.setdefault(rn, []).append(b)

        today = date.today()
        rooms = []
        for r in rows:
            stored_status = r.get("status")
            rn = r.get("room_number")
            dynamic_status = stored_status

            for booking in bookings_by_room.get(rn, []):
                try:
                    ci = booking.get("check_in")
                    co = booking.get("check_out")
                    check_in = datetime.strptime(ci, "%Y-%m-%d").date() if isinstance(ci, str) else ci
                    check_out = datetime.strptime(co, "%Y-%m-%d").date() if isinstance(co, str) else co
                    if check_in <= today < check_out:
                        dynamic_status = "Occupied"
                        break
                except Exception:
                    continue

            rooms.append({
                "room_number": rn,
                "room_type": r.get("room_type"),
                "status": dynamic_status,
                "price": int(r.get("price") or 0),
                "capacity": r.get("capacity") or 0,
                "floor": r.get("floor"),
                "amenities": r.get("amenities") or []
            })

        # Cache search results briefly
        CacheManager.set_cache(cache_key, rooms, CacheManager.DEFAULT_TTL)
        return rooms

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rooms")
def add_room(room_data: dict):
    """Add a new room (only invalidate related cache)."""
    try:
        rtype_res = supabase.table("room_types").select("*").eq("name", room_data["room_type"]).execute()
        if not rtype_res.data:
            raise HTTPException(status_code=400, detail="Invalid room type")

        rtype = rtype_res.data[0]
        if not rtype["is_available"]:
            raise HTTPException(status_code=400, detail="This room type is unavailable")

        exists = supabase.table("rooms").select("room_number").eq("room_number", room_data["room_number"]).execute()
        if exists.data:
            raise HTTPException(status_code=400, detail="Room number already exists")

        insert_data = {
            "room_number": room_data["room_number"],
            "room_type_id": rtype["id"],
            "room_type": rtype["name"],
            "status": room_data.get("status", "Available"),
            "floor": room_data["floor"]
        }
        supabase.table("rooms").insert(insert_data).execute()

        CacheManager.delete_cache(CacheManager.ROOM_STATS_KEY)
        CacheManager.delete_pattern("rooms_list:*")
        return {"message": "Room added successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/rooms/{room_number}")
async def update_room(room_number: str, room_data: dict):
    """Update specific room status with safe cache invalidation."""
    try:
        current = supabase.table("rooms").select("*").eq("room_number", room_number).execute().data
        if not current:
            raise HTTPException(status_code=404, detail="Room not found")

        current = current[0]
        new_status = room_data.get("status")
        if not new_status or new_status == current["status"]:
            return {"message": "No changes made"}

        active = check_room_has_active_bookings(room_number)
        dynamic = determine_room_status(room_number, current["status"])

        if new_status == "Maintenance":
            if active or dynamic == "Occupied":
                raise HTTPException(status_code=400, detail="Cannot change to Maintenance while active/occupied.")
        if new_status == "Occupied" and not active:
            raise HTTPException(status_code=400, detail="Cannot manually mark room as Occupied.")
        if new_status == "Available" and active:
            raise HTTPException(status_code=400, detail="Room still has active bookings.")

        supabase.table("rooms").update({"status": new_status}).eq("room_number", room_number).execute()

        if new_status in ["Maintenance", "Occupied"]:
            await trigger_room_status_changed(room_number=room_number, new_status=new_status)

        CacheManager.delete_cache(f"room:{room_number}")
        CacheManager.delete_cache(CacheManager.ROOM_STATS_KEY)
        CacheManager.delete_pattern("rooms_list:*")
        return {"message": "Room updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/rooms/{room_number}")
def delete_room(room_number: str):
    """Delete a room and clear related cache only."""
    try:
        bookings = supabase.table("bookings").select("id").eq("room_number", room_number).execute().data
        if bookings:
            raise HTTPException(status_code=400, detail="Cannot delete room with existing bookings.")

        res = supabase.table("rooms").delete().eq("room_number", room_number).execute()
        if not res.data:
            raise HTTPException(status_code=404, detail="Room not found")

        CacheManager.delete_cache(f"room:{room_number}")
        CacheManager.delete_cache(CacheManager.ROOM_STATS_KEY)
        CacheManager.delete_pattern("rooms_list:*")
        return {"message": "Room deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))