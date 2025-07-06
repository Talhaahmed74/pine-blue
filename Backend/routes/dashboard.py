from fastapi import APIRouter, HTTPException
from supabase_client import supabase
from datetime import datetime, timezone, date

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
def get_all_dashboard_bookings():
    try:
        result = supabase.rpc("get_dashboard_bookings").execute()
        if not result.data:
            return {"bookings": []}

        # Process recent bookings
        bookings = []
        for b in result.data:
            bookings.append({
                "id": b["booking_id"],
                "guest": f"{b.get('first_name', '')} {b.get('last_name', '')}".strip(),
                "room": f"{b['room_type']} Room {b['room_number']}",
                "checkIn": b["check_in"],
                "checkOut": b["check_out"],
                "status": b["status"],
                "source": b["source"],
                "amount": f"₨{int(b['total_amount']):,}" if b.get("total_amount") else "₨0"
            })

        # Sort by check-in date descending
        bookings = sorted(bookings, key=lambda x: x["checkIn"], reverse=True)

        return {"bookings": bookings}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Booking fetch failed: {str(e)}")
