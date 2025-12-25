from models.notification import NotificationCreate, NotificationUpdate, ConnectionManager
from supabase_client import supabase
from fastapi.responses import JSONResponse
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
import asyncio
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)
router = APIRouter()
manager = ConnectionManager()

# Pydantic model for notification settings
class NotificationSettings(BaseModel):
    notifications_enabled: bool

# Helper to get unread count
def get_unread_count() -> int:
    try:
        response = supabase.table("notifications").select("id", count="exact").eq("is_read", False).execute()
        return response.count if response.count else 0
    except:
        return 0

async def call_edge_function_for_cleanup(booking_id: Optional[str] = None, delay_minutes: int = 7):
    """
    Schedule booking cleanup for unpaid bookings.
    This function handles the automatic cancellation of bookings that aren't paid within the time limit.
    
    Args:
        booking_id: Specific booking to clean up (None = clean all unpaid)
        delay_minutes: How long to wait before cleanup (default: 7 minutes)
    """
    try:
        logger.info(f"🕐 Scheduling cleanup in {delay_minutes} minutes for booking: {booking_id or 'all unpaid'}")
        
        # Wait for the specified delay
        if delay_minutes > 0:
            await asyncio.sleep(delay_minutes * 60)
        
        logger.info(f"🧹 Starting cleanup process for booking: {booking_id or 'all unpaid'}")
        
        # Calculate cutoff time (bookings older than this are eligible for cleanup)
        cutoff_time = datetime.utcnow() - timedelta(minutes=delay_minutes)
        
        # Query for unpaid/pending bookings that are past the cutoff
        query = supabase.table("bookings").select("booking_id, room_number, first_name, last_name, status, created_at")
        
        if booking_id:
            # Clean specific booking
            query = query.eq("booking_id", booking_id)
        else:
            # Clean all eligible bookings
            query = query.eq("status", "pending").eq("is_cancelled", False).lte("created_at", cutoff_time.isoformat())
        
        bookings_to_cleanup = query.execute()
        
        if not bookings_to_cleanup.data:
            logger.info("✅ No bookings to cleanup")
            return
        
        logger.info(f"🗑️ Found {len(bookings_to_cleanup.data)} bookings to cleanup")
        
        # Process each booking
        for booking in bookings_to_cleanup.data:
            try:
                booking_id_to_cancel = booking["booking_id"]
                room_number = booking["room_number"]
                guest_name = f"{booking.get('first_name', '')} {booking.get('last_name', '')}".strip()
                
                # Check if billing exists
                billing_check = supabase.table("billing").select("id, payment_status").eq("booking_id", booking_id_to_cancel).execute()
                
                if billing_check.data and billing_check.data[0].get("payment_status") in ["Paid", "paid"]:
                    logger.info(f"⏭️ Skipping {booking_id_to_cancel} - already paid")
                    continue
                
                # Cancel the booking
                supabase.table("bookings").update({
                    "status": "cancelled",
                    "is_cancelled": True,
                    "updated_at": datetime.utcnow().isoformat()
                }).eq("booking_id", booking_id_to_cancel).execute()
                
                # Cancel billing if exists
                if billing_check.data:
                    supabase.table("billing").update({
                        "is_cancelled": True,
                        "cancelled_at": datetime.utcnow().isoformat()
                    }).eq("booking_id", booking_id_to_cancel).execute()
                
                # Reset room status to Available
                # Check for other active bookings first
                other_bookings = supabase.table("bookings").select("booking_id, check_in, status").eq("room_number", room_number).neq("booking_id", booking_id_to_cancel).eq("is_cancelled", False).execute()
                
                new_room_status = "Available"
                from datetime import date
                today = date.today()
                
                for other_booking in other_bookings.data:
                    other_check_in = date.fromisoformat(other_booking["check_in"]) if isinstance(other_booking["check_in"], str) else other_booking["check_in"]
                    other_status = other_booking.get("status", "")
                    
                    if other_check_in == today and other_status in ["confirmed", "pending"]:
                        new_room_status = "Occupied" if other_status == "confirmed" else "Booked"
                        break
                    elif other_check_in > today and other_status in ["confirmed", "pending"]:
                        new_room_status = "Booked"
                        break
                
                # Update room status
                supabase.table("rooms").update({"status": new_room_status}).eq("room_number", room_number).execute()
                
                logger.info(f"✅ Cleaned up booking {booking_id_to_cancel}, room {room_number} set to {new_room_status}")
                
                # Trigger notification
                await trigger_booking_expired(
                    booking_id=booking_id_to_cancel,
                    guest_name=guest_name or "Guest",
                    room_number=room_number
                )
                
            except Exception as booking_error:
                logger.error(f"❌ Error cleaning up booking {booking.get('booking_id')}: {booking_error}")
                continue
        
        logger.info(f"🎉 Cleanup completed. Processed {len(bookings_to_cleanup.data)} bookings")
        
    except Exception as e:
        logger.error(f"❌ Cleanup function error: {e}")
        import traceback
        traceback.print_exc()

# WebSocket for Admin Notifications
@router.websocket("/ws/admin")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        unread_count = get_unread_count()
        await manager.send_personal_message({"type": "unread_count", "count": unread_count}, websocket)

        while True:
            data = await websocket.receive_text()
            if data:
                try:
                    message = json.loads(data)
                    if message.get("type") == "ping":
                        await websocket.send_json({"type": "pong"})
                except json.JSONDecodeError:
                    pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


# Get Unread Count
@router.get("/unread-count")
async def get_unread_count_endpoint():
    try:
        count = get_unread_count()
        return {"success": True, "count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching unread count: {str(e)}")

# Add this new endpoint for paginated notifications with time-based filtering
@router.get("/")
async def get_notifications(
    limit: int = Query(20, ge=1, le=50),  # Reduced max limit for optimization
    offset: int = Query(0, ge=0),
    is_read: Optional[bool] = None,
    time_filter: str = Query("new", description="Filter: 'new' (7 days), 'older' (30 days)")
):
    try:
        from datetime import datetime, timedelta
        
        # Calculate date threshold based on filter
        now = datetime.utcnow()
        if time_filter == "new":
            date_threshold = now - timedelta(days=7)
        else:  # older
            date_threshold = now - timedelta(days=30)
        
        query = supabase.table("notifications").select("*", count="exact").order("created_at", desc=True)
        
        # Apply filters
        if is_read is not None:
            query = query.eq("is_read", is_read)
        
        query = query.gte("created_at", date_threshold.isoformat())
        
        # Apply pagination
        response = query.range(offset, offset + limit - 1).execute()

        return {
            "success": True,
            "data": response.data,
            "count": len(response.data),
            "total": response.count,
            "has_more": response.count > (offset + limit) if response.count else False
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")


# Get Notification Settings
@router.get("/settings/")
async def get_notification_settings():
    try:
        response = supabase.table("notification_settings").select("*").limit(1).execute()
        
        if not response.data:
            # Create default settings if none exist
            default_settings = {"notifications_enabled": True}
            insert_response = supabase.table("notification_settings").insert(default_settings).execute()
            return {"success": True, "data": insert_response.data[0]}
        
        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching settings: {str(e)}")


# Update Notification Settings
@router.put("/settings/")
async def update_notification_settings(settings: NotificationSettings):
    try:
        # Get the first settings record
        response = supabase.table("notification_settings").select("id").limit(1).execute()
        
        if not response.data:
            # Create new settings if none exist
            insert_response = supabase.table("notification_settings").insert({
                "notifications_enabled": settings.notifications_enabled
            }).execute()
            return {"success": True, "data": insert_response.data[0]}
        
        # Update existing settings
        settings_id = response.data[0]["id"]
        update_response = supabase.table("notification_settings").update({
            "notifications_enabled": settings.notifications_enabled,
            "updated_at": "now()"
        }).eq("id", settings_id).execute()
        
        return {"success": True, "data": update_response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

# REST API: Fetch Notifications
@router.get("/")
async def get_notifications(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0), is_read: Optional[bool] = None):
    try:
        query = supabase.table("notifications").select("*").order("created_at", desc=True)
        if is_read is not None:
            query = query.eq("is_read", is_read)
        response = query.range(offset, offset + limit - 1).execute()

        return {"success": True, "data": response.data, "count": len(response.data)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching notifications: {str(e)}")


# Mark All as Read (MUST be before /{notification_id} to avoid route conflict)
@router.patch("/mark-all-read")
async def mark_all_as_read():
    try:
        supabase.table("notifications").update({"is_read": True}).eq("is_read", False).execute()
        await manager.broadcast({"type": "unread_count", "count": 0})
        return {"success": True, "message": "All notifications marked as read"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error marking all as read: {str(e)}")


# Mark Notification as Read/Unread
@router.patch("/{notification_id}")
async def update_notification(notification_id: int, update_data: NotificationUpdate):
    try:
        response = supabase.table("notifications").update({"is_read": update_data.is_read}).eq("id", notification_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")

        unread_count = get_unread_count()
        await manager.broadcast({"type": "unread_count", "count": unread_count})

        return {"success": True, "data": response.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating notification: {str(e)}")


# Delete Notification
@router.delete("/{notification_id}")
async def delete_notification(notification_id: int):
    try:
        response = supabase.table("notifications").delete().eq("id", notification_id).execute()
        if not response.data:
            raise HTTPException(status_code=404, detail="Notification not found")
        return {"success": True, "message": "Notification deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting notification: {str(e)}")


# Helper to Create & Broadcast Notification
async def create_notification(type: str, title: str, message: str, related_booking_id: Optional[str] = None, related_room_number: Optional[str] = None):
    try:
        notification_data = {
            "type": type,
            "title": title,
            "message": message,
            "related_booking_id": related_booking_id,
            "related_room_number": related_room_number,
            "is_read": False
        }
        response = supabase.table("notifications").insert(notification_data).execute()
        if response.data:
            notification = response.data[0]
            await manager.broadcast({"type": "new_notification", "notification": notification})
            await manager.broadcast({"type": "unread_count", "count": get_unread_count()})
            return notification
    except Exception as e:
        print(f"Error creating notification: {e}")
        return None


# Event triggers (call these from other routes)
async def trigger_booking_created(
    booking_id: str, 
    guest_name: str,
    room_number: str = None,
    status: str = "pending"
):
    """Notify admin about new booking"""
    await create_notification(
        "booking_created", 
        "New Booking Created", 
        f"New {status} booking #{booking_id} created for {guest_name} - Room: {room_number}",
        related_booking_id=booking_id,
        related_room_number=room_number
    )

async def trigger_booking_updated(booking_id: str, guest_name: str):
    await create_notification("booking_updated", "Booking Updated", f"Booking #{booking_id} for {guest_name} has been updated", related_booking_id=booking_id)

async def trigger_booking_cancelled(booking_id: str, guest_name: str):
    await create_notification("booking_cancelled", "Booking Cancelled", f"Booking #{booking_id} for {guest_name} has been cancelled", related_booking_id=booking_id)

async def trigger_room_status_changed(room_number: str, new_status: str):
    await create_notification("room_updated", "Room Status Changed", f"Room {room_number} status changed to {new_status}", related_room_number=room_number)

# Add new function for payment completed
async def trigger_booking_payment_completed(
    booking_id: str,
    guest_name: str,
    room_number: str,
    total_amount: float,
    payment_method: str
):
    """Notify admin about payment completion"""
    await create_notification(
        "payment_completed",
        "Payment Received",
        f"Payment of Rs. {total_amount} received for booking #{booking_id} ({guest_name}) - Room: {room_number}",
        related_booking_id=booking_id,
        related_room_number=room_number
    )


# Add new function for booking expired
async def trigger_booking_expired(
    booking_id: str,
    guest_name: str,
    room_number: str
):
    """Notify admin about expired booking"""
    await create_notification(
        "booking_expired",
        "Booking Expired",
        f"Booking #{booking_id} for {guest_name} expired due to payment timeout - Room: {room_number}",
        related_booking_id=booking_id,
        related_room_number=room_number
    )