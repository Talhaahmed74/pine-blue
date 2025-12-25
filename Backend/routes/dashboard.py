from fastapi import APIRouter, HTTPException, Query
from supabase_client import supabase
from datetime import datetime, timezone, date, timedelta

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary")
def get_dashboard_summary():
    try:
        # ✅ Bookings
        bookings_result = supabase.rpc("get_dashboard_bookings").execute()
        bookings = bookings_result.data or []

        # ✅ Rooms
        rooms_result = supabase.table("rooms").select("status").execute()
        rooms = rooms_result.data or []

        total_bookings = len(bookings)
        total_rooms = len(rooms)
        occupied_count = sum(1 for r in rooms if r["status"] == "Occupied")
        total_guests = sum(b["guests"] for b in bookings)

        # ✅ Revenue Today
        today_str = datetime.now(timezone.utc).date().isoformat()

        billing_result = supabase.table("billing").select("total_amount", "created_at").execute()

        today_total = sum(
            b["total_amount"]
            for b in billing_result.data
            if b["created_at"] and b["created_at"][:10] == today_str
        )

        return {
            "total_bookings": total_bookings,
            "occupied_rooms": f"{occupied_count}/{total_rooms}",
            "revenue_today": f"₨{int(today_total):,}",
            "total_guests": total_guests
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Dashboard summary failed: {str(e)}")


@router.get("/bookings")
def get_all_bookings(limit: int = Query(8), offset: int = Query(0)):
    """Get recent/future bookings (with billing), exclude cancelled ones"""
    try:
        today = datetime.utcnow().date()
        fifteen_days_ago = today - timedelta(days=15)

        # 🔧 Fixed: Fetch bookings with billing and ensure proper ordering
        bookings_result = supabase.table("bookings") \
            .select("booking_id, check_in, check_out, guests, room_number, room_type, first_name, last_name, email, phone, status, source, created_at, billing(total_amount)") \
            .gte("check_in", fifteen_days_ago.isoformat()) \
            .eq("is_cancelled", False) \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        bookings = bookings_result.data or []
        
        # 🔧 Fixed: Ensure booking_id is returned properly
        formatted_bookings = []
        for booking in bookings:
            # Ensure billing is properly formatted
            billing_amount = 0
            if booking.get("billing"):
                if isinstance(booking["billing"], list) and booking["billing"]:
                    billing_amount = booking["billing"][0].get("total_amount", 0)
                elif isinstance(booking["billing"], dict):
                    billing_amount = booking["billing"].get("total_amount", 0)
            
            formatted_booking = {
                **booking,
                "billing": {"total_amount": billing_amount} if billing_amount else None
            }
            formatted_bookings.append(formatted_booking)

        return {"bookings": formatted_bookings}

    except Exception as e:
        print(f"Error fetching bookings: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=f"Failed to fetch bookings: {str(e)}")


@router.get("/bookings/search")
def search_bookings(query: str = Query(...), limit: int = Query(8), offset: int = Query(0)):
    """Search bookings by partial booking_id with pagination - includes cancelled and past bookings"""
    try:
        # 🔧 Search for ALL bookings that start with the query (no date or cancellation filters)
        bookings_result = supabase.table("bookings") \
            .select("booking_id, check_in, check_out, guests, room_number, room_type, first_name, last_name, email, phone, status, source, created_at, is_cancelled, billing(total_amount)") \
            .ilike("booking_id", f"{query}%") \
            .order("created_at", desc=True) \
            .range(offset, offset + limit - 1) \
            .execute()

        bookings = bookings_result.data or []
        
        # Format billing data and handle cancelled bookings
        formatted_bookings = []
        for booking in bookings:
            billing_amount = 0
            if booking.get("billing"):
                if isinstance(booking["billing"], list) and booking["billing"]:
                    billing_amount = booking["billing"][0].get("total_amount", 0)
                elif isinstance(booking["billing"], dict):
                    billing_amount = booking["billing"].get("total_amount", 0)
            
            # 🔧 Override status to "Cancelled" if booking is cancelled
            booking_status = booking.get("status", "Unknown")
            if booking.get("is_cancelled", False):
                booking_status = "Cancelled"
            
            formatted_booking = {
                **booking,
                "status": booking_status,  # Ensure cancelled bookings show "Cancelled" status
                "billing": {"total_amount": billing_amount} if billing_amount else None
            }
            formatted_bookings.append(formatted_booking)

        return {"bookings": formatted_bookings, "query": query, "total": len(formatted_bookings)}

    except Exception as e:
        print(f"Error searching bookings with query '{query}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")



def get_booking(booking_id: str):
    """Get a specific booking with billing information"""
    try:
        # 🔧 Fixed: Ensure proper selection of fields including booking_id
        booking_result = supabase.table("bookings") \
            .select("booking_id, check_in, check_out, guests, room_number, room_type, first_name, last_name, email, phone, status, source, created_at, special_requests, billing(total_amount)") \
            .eq("booking_id", booking_id) \
            .eq("is_cancelled", False) \
            .execute()
        
        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = booking_result.data[0]
        
        # 🔧 Fixed: Properly format billing data
        if booking.get("billing"):
            if isinstance(booking["billing"], list) and booking["billing"]:
                billing_amount = booking["billing"][0].get("total_amount", 0)
            elif isinstance(booking["billing"], dict):
                billing_amount = booking["billing"].get("total_amount", 0)
            else:
                billing_amount = 0
            
            booking["billing"] = {"total_amount": billing_amount}
        
        # Add compatibility fields (keeping your existing logic)
        if not booking.get("guest_name") and booking.get("first_name"):
            booking["guest_name"] = f"{booking.get('first_name', '')} {booking.get('last_name', '')}".strip()
        
        if not booking.get("guest_email") and booking.get("email"):
            booking["guest_email"] = booking["email"]
            
        if not booking.get("guest_phone") and booking.get("phone"):
            booking["guest_phone"] = str(booking["phone"])
        
        return booking
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching booking {booking_id}: {str(e)}")  # Debug log
        raise HTTPException(status_code=500, detail=f"Failed to fetch booking: {str(e)}")


# 🆕 Additional helper endpoint to check booking counts (useful for debugging)
@router.get("/bookings/debug/count")
def get_booking_count():
    """Debug endpoint to check total booking counts"""
    try:
        total_result = supabase.table("bookings").select("booking_id", count="exact").execute()
        active_result = supabase.table("bookings").select("booking_id", count="exact").eq("is_cancelled", False).execute()
        cancelled_result = supabase.table("bookings").select("booking_id", count="exact").eq("is_cancelled", True).execute()
        
        return {
            "total_bookings": total_result.count,
            "active_bookings": active_result.count,
            "cancelled_bookings": cancelled_result.count,
            "note": "Search includes all bookings (active + cancelled + past)"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# 🆕 Search debug endpoint to test search functionality
@router.get("/bookings/debug/search/{query}")
def debug_search_bookings(query: str):
    """Debug endpoint to test search functionality"""
    try:
        # Get sample of search results
        bookings_result = supabase.table("bookings") \
            .select("booking_id, status, is_cancelled, check_in, first_name, last_name") \
            .ilike("booking_id", f"{query}%") \
            .order("created_at", desc=True) \
            .limit(10) \
            .execute()

        bookings = bookings_result.data or []
        
        return {
            "query": query,
            "total_found": len(bookings),
            "sample_results": bookings[:5],  # First 5 results
            "includes_cancelled": any(b.get("is_cancelled", False) for b in bookings),
            "statuses_found": list(set(b.get("status", "Unknown") for b in bookings))
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))