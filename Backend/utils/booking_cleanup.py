# utils/booking_cleanup.py - Background task manager for booking cleanup
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Set
from supabase_client import supabase

logger = logging.getLogger(__name__)

class BookingCleanupManager:
    """Manages cleanup of abandoned bookings"""
    
    def __init__(self):
        self.pending_cleanups: Dict[str, asyncio.Task] = {}
        self.cancelled_bookings: Set[str] = set()
    
    async def schedule_cleanup(self, booking_id: str, delay_minutes: int = 15):
        """Schedule cleanup for a booking after specified delay"""
        if booking_id in self.pending_cleanups:
            # Cancel existing cleanup task
            self.pending_cleanups[booking_id].cancel()
        
        # Schedule new cleanup task
        cleanup_task = asyncio.create_task(
            self._cleanup_after_delay(booking_id, delay_minutes)
        )
        self.pending_cleanups[booking_id] = cleanup_task
        
        logger.info(f"⏰ Scheduled cleanup for booking {booking_id} in {delay_minutes} minutes")
    
    def cancel_cleanup(self, booking_id: str):
        """Cancel scheduled cleanup for a booking (called when billing is completed)"""
        if booking_id in self.pending_cleanups:
            self.pending_cleanups[booking_id].cancel()
            del self.pending_cleanups[booking_id]
            logger.info(f"✅ Cancelled cleanup for booking {booking_id} - billing completed")
    
    async def _cleanup_after_delay(self, booking_id: str, delay_minutes: int):
        """Internal method to cleanup booking after delay"""
        try:
            # Wait for the specified delay
            await asyncio.sleep(delay_minutes * 60)
            
            # Check if booking was already cancelled manually
            if booking_id in self.cancelled_bookings:
                self.cancelled_bookings.remove(booking_id)
                return
            
            # Check if billing was created for this booking
            billing_check = supabase.table("billing").select("id").eq("booking_id", booking_id).execute()
            
            if billing_check.data:
                # Billing exists, don't cleanup
                logger.info(f"✅ Booking {booking_id} has billing record, skipping cleanup")
                return
            
            # Get booking details before cleanup
            booking_result = supabase.table("bookings").select("*").eq("booking_id", booking_id).execute()
            
            if not booking_result.data:
                logger.warning(f"⚠️ Booking {booking_id} not found during cleanup")
                return
            
            booking = booking_result.data[0]
            
            # Only cleanup if status is still pending
            if booking["status"] != "pending":
                logger.info(f"ℹ️ Booking {booking_id} status is {booking['status']}, skipping cleanup")
                return
            
            # Perform cleanup
            await self._cleanup_booking(booking_id, booking)
            
        except asyncio.CancelledError:
            logger.info(f"🚫 Cleanup cancelled for booking {booking_id}")
        except Exception as e:
            logger.error(f"❌ Error during cleanup of booking {booking_id}: {e}")
        finally:
            # Remove from pending cleanups
            if booking_id in self.pending_cleanups:
                del self.pending_cleanups[booking_id]
    
    async def _cleanup_booking(self, booking_id: str, booking: dict):
        """Perform the actual cleanup of an abandoned booking"""
        try:
            room_number = booking["room_number"]
            
            # Delete the abandoned booking
            delete_result = supabase.table("bookings").delete().eq("booking_id", booking_id).execute()
            
            if delete_result.data is not None:  # Supabase returns None for empty results
                # Reset room status to Available
                supabase.table("rooms").update({"status": "Available"}).eq("room_number", room_number).execute()
                
                logger.info(f"🧹 Cleaned up abandoned booking {booking_id} and reset room {room_number}")
                
                # Optionally, send notification to admin or user
                await self._notify_booking_expired(booking_id, booking)
            else:
                logger.warning(f"⚠️ Failed to delete booking {booking_id} during cleanup")
                
        except Exception as e:
            logger.error(f"❌ Error cleaning up booking {booking_id}: {e}")
    
    async def _notify_booking_expired(self, booking_id: str, booking: dict):
        """Send notification about expired booking (implement as needed)"""
        try:
            # You can implement email notification, admin alert, etc.
            logger.info(f"📧 Booking {booking_id} expired for guest {booking['first_name']} {booking['last_name']}")
            
            # Example: Log to admin notifications table
            # supabase.table("admin_notifications").insert({
            #     "type": "booking_expired",
            #     "booking_id": booking_id,
            #     "message": f"Booking {booking_id} expired due to incomplete payment",
            #     "created_at": datetime.utcnow().isoformat()
            # }).execute()
            
        except Exception as e:
            logger.error(f"❌ Error sending expiry notification for booking {booking_id}: {e}")
    
    def force_cancel_booking(self, booking_id: str):
        """Manually mark booking as cancelled to prevent automatic cleanup"""
        self.cancelled_bookings.add(booking_id)
        self.cancel_cleanup(booking_id)
        logger.info(f"🚫 Manually cancelled booking {booking_id}")
    
    async def cleanup_all_expired_bookings(self):
        """Manual cleanup of all expired bookings (can be run periodically)"""
        try:
            # Find all pending bookings older than 15 minutes
            cutoff_time = datetime.utcnow() - timedelta(minutes=15)
            
            expired_bookings = supabase.table("bookings").select("*").eq("status", "pending").lt("created_at", cutoff_time.isoformat()).execute()
            
            for booking in expired_bookings.data:
                booking_id = booking["booking_id"]
                
                # Check if billing exists
                billing_check = supabase.table("billing").select("id").eq("booking_id", booking_id).execute()
                
                if not billing_check.data:
                    # No billing, cleanup this booking
                    await self._cleanup_booking(booking_id, booking)
            
            logger.info(f"🧹 Manual cleanup completed, processed {len(expired_bookings.data)} expired bookings")
            
        except Exception as e:
            logger.error(f"❌ Error during manual cleanup: {e}")
    
    def get_pending_cleanups(self) -> list:
        """Get list of bookings scheduled for cleanup"""
        return list(self.pending_cleanups.keys())
    
    def get_stats(self) -> dict:
        """Get cleanup manager statistics"""
        return {
            "pending_cleanups": len(self.pending_cleanups),
            "cancelled_bookings": len(self.cancelled_bookings),
            "active_tasks": sum(1 for task in self.pending_cleanups.values() if not task.done())
        }

# Global instance
cleanup_manager = BookingCleanupManager()

# Utility functions for easy access
async def schedule_booking_cleanup(booking_id: str, delay_minutes: int = 15):
    """Schedule cleanup for a booking"""
    await cleanup_manager.schedule_cleanup(booking_id, delay_minutes)

def cancel_booking_cleanup(booking_id: str):
    """Cancel scheduled cleanup for a booking"""
    cleanup_manager.cancel_cleanup(booking_id)

def force_cancel_booking(booking_id: str):
    """Manually cancel a booking to prevent cleanup"""
    cleanup_manager.force_cancel_booking(booking_id)

async def manual_cleanup_expired():
    """Manually run cleanup for all expired bookings"""
    await cleanup_manager.cleanup_all_expired_bookings()