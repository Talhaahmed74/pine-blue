# routes/billing_routes.py - Updated billing flow with Booked status
from fastapi import APIRouter, HTTPException
from models.billing import BillingCreateRequest, BillingResponse
from routes.notifications import trigger_booking_payment_completed
from supabase_client import supabase
from datetime import datetime, date, timedelta, timezone
import logging
import asyncio
from utils.cache_helper import CacheManager, get_billing_settings_cached

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
# HELPER: UPDATE ROOM STATUS AFTER PAYMENT
# ============================================

async def update_room_status_after_payment(room_number: str, check_in_date: date):
    """
    Update room status after successful payment:
    - If check-in is TODAY (PKT): mark as "Occupied"
    - If check-in is FUTURE: keep as "Booked" (already set during booking)
    - Payment confirmation doesn't change "Booked" status for future bookings
    """
    pkt_today = get_pkt_today()
    
    if check_in_date == pkt_today:
        # Payment confirmed for today's booking - mark as Occupied
        logging.info(f"🏨 Payment confirmed for TODAY's booking - marking room {room_number} as Occupied")
        await asyncio.to_thread(
            lambda: supabase.table("rooms")
            .update({"status": "Occupied"})
            .eq("room_number", room_number)
            .execute()
        )
    else:
        # Future booking - room should already be "Booked" from booking creation
        logging.info(f"📅 Payment confirmed for FUTURE booking ({check_in_date}) - room {room_number} remains Booked")
        # No room status change needed - it's already "Booked"

# ============================================
# ENDPOINT: CREATE BILLING & CONFIRM BOOKING
# ============================================

@router.post("/billing", response_model=BillingResponse)
async def create_billing_for_booking(billing_request: BillingCreateRequest):
    """
    Create billing record and confirm booking.
    🔥 CUSTOMER FLOW: Room status was already updated during booking creation.
    - For today's bookings: now mark as "Occupied" after payment
    - For future bookings: already "Booked", stays "Booked"
    
    Flow:
    1. Verify booking exists and is pending
    2. Check no billing exists yet (CRITICAL: prevents duplicate billing)
    3. Get room type and billing settings
    4. Calculate billing amounts
    5. Create billing record
    6. Update booking status to 'confirmed'
    7. Update room status only for today's bookings (Occupied)
    8. Trigger notifications
    9. Invalidate cache
    """
    try:
        booking_id = billing_request.booking_id
        
        # Step 1: Get booking details
        booking_result = await asyncio.to_thread(
            lambda: supabase.table("bookings")
            .select("*")
            .eq("booking_id", booking_id)
            .execute()
        )
        
        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = booking_result.data[0]
        
        # Validate booking status
        if booking["status"] != "pending":
            raise HTTPException(
                status_code=400,
                detail=f"Cannot create billing for booking with status: {booking['status']}"
            )
        
        if booking["is_cancelled"]:
            raise HTTPException(
                status_code=400,
                detail="Cannot create billing for cancelled booking"
            )
        
        # Step 2: 🔥 CRITICAL CHECK - Prevent duplicate billing
        existing_billing = await asyncio.to_thread(
            lambda: supabase.table("billing")
            .select("id")
            .eq("booking_id", booking_id)
            .execute()
        )
        
        if existing_billing.data:
            logging.warning(f"⚠️ Billing already exists for booking {booking_id}")
            raise HTTPException(
                status_code=400,
                detail="Billing already exists for this booking. Please refresh the page."
            )
        
        # Step 3: Get room type and billing settings in parallel
        room_type_task = asyncio.to_thread(
            lambda: supabase.table("room_types")
            .select("*")
            .eq("name", booking["room_type"])
            .execute()
        )
        billing_settings_task = get_billing_settings_cached()
        
        room_type_result, billing_settings = await asyncio.gather(
            room_type_task, billing_settings_task
        )
        
        if not room_type_result.data:
            raise HTTPException(status_code=404, detail="Room type not found")
        
        room_type = room_type_result.data[0]
        
        # Step 4: Calculate billing
        check_in = datetime.fromisoformat(booking["check_in"]).date()
        check_out = datetime.fromisoformat(booking["check_out"]).date()
        nights = (check_out - check_in).days or 1
        
        base_amount = room_type["base_price"] * nights
        discount_amount = base_amount * (billing_settings["discount"] / 100)
        vat_amount = (base_amount - discount_amount) * (billing_settings["vat"] / 100)
        total_amount = base_amount - discount_amount + vat_amount
        
        # Step 5: Create billing record
        billing_insert_data = {
            "booking_id": booking_id,
            "room_price": room_type["base_price"],
            "discount": billing_settings["discount"],
            "vat": billing_settings["vat"],
            "total_amount": total_amount,
            "payment_method": billing_request.payment_method,
            "payment_status": billing_request.payment_status,
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        try:
            billing_result = await asyncio.to_thread(
                lambda: supabase.table("billing").insert(billing_insert_data).execute()
            )
            
            if not billing_result.data:
                raise Exception("Failed to insert billing record")
                
        except Exception as billing_error:
            logging.error(f"❌ Billing insertion failed: {billing_error}")
            # Check if it's a foreign key constraint error
            error_msg = str(billing_error)
            if "foreign key" in error_msg.lower() or "violates foreign key constraint" in error_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail="Booking reference is invalid. Please create a new booking."
                )
            elif "duplicate key" in error_msg.lower() or "unique constraint" in error_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail="Billing already exists for this booking."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to create billing record: {error_msg}"
                )
        
        # Step 6: Update booking status to confirmed
        try:
            await asyncio.to_thread(
                lambda: supabase.table("bookings")
                .update({
                    "status": "confirmed",
                    "updated_at": datetime.utcnow().isoformat()
                })
                .eq("booking_id", booking_id)
                .execute()
            )
            
            logging.info(f"✅ Billing created and booking {booking_id} confirmed")
            
        except Exception as booking_update_error:
            # Rollback billing if booking update fails
            logging.error(f"❌ Booking update failed: {booking_update_error}")
            await asyncio.to_thread(
                lambda: supabase.table("billing")
                .delete()
                .eq("booking_id", booking_id)
                .execute()
            )
            raise HTTPException(
                status_code=500,
                detail="Failed to confirm booking. Please try again."
            )
        
        # Step 7: 🔥 Update room status ONLY for today's bookings
        # Future bookings already have "Booked" status from booking creation
        await update_room_status_after_payment(booking["room_number"], check_in)
        
        # Step 8: Trigger notification (non-blocking)
        guest_name = f"{booking['first_name']} {booking['last_name']}"
        asyncio.create_task(
            trigger_booking_payment_completed(
                booking_id=booking_id,
                guest_name=guest_name,
                room_number=booking["room_number"],
                total_amount=total_amount,
                payment_method=billing_request.payment_method
            )
        )
        
        # Step 9: Cache invalidation (non-blocking)
        asyncio.create_task(
            asyncio.to_thread(
                lambda: CacheManager.invalidate_booking_related_cache(
                    room_number=booking["room_number"],
                    user_id=booking.get("user_id")
                )
            )
        )
        
        return BillingResponse(
            success=True,
            booking_id=booking_id,
            billing_id=billing_result.data[0]["id"] if billing_result.data else None,
            total_amount=total_amount,
            payment_status=billing_request.payment_status,
            message="Payment completed successfully. Booking confirmed!"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"❌ Error creating billing: {e}")
        raise HTTPException(status_code=500, detail=f"Billing creation failed: {str(e)}")

# ============================================
# ENDPOINT: GET BILLING BY BOOKING ID
# ============================================

@router.get("/billing/{booking_id}")
async def get_billing_by_booking(booking_id: str):
    """Get billing information for a specific booking"""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("billing")
            .select("*")
            .eq("booking_id", booking_id)
            .execute()
        )
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Billing record not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching billing record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch billing record: {str(e)}")

# ============================================
# ENDPOINT: GET BILLING SETTINGS
# ============================================

@router.get("/billing-settings")
async def get_billing_settings():
    """Get current billing settings (VAT and discount)"""
    try:
        result = await asyncio.to_thread(
            lambda: supabase.table("billing_settings")
            .select("*")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        
        if not result.data:
            # Create default settings if none exist
            default_settings = {
                "vat": 13.0,
                "discount": 0.0,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            insert_result = await asyncio.to_thread(
                lambda: supabase.table("billing_settings")
                .insert(default_settings)
                .execute()
            )
            settings_data = insert_result.data[0]
        else:
            settings_data = result.data[0]
        
        return {
            "success": True,
            "data": {
                "id": settings_data.get("id"),
                "vat": float(settings_data["vat"]),
                "discount": float(settings_data["discount"]),
                "updated_at": settings_data.get("updated_at")
            },
            "message": "Billing settings retrieved successfully"
        }
        
    except Exception as e:
        logging.error(f"Error fetching billing settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch billing settings: {str(e)}")

# ============================================
# ENDPOINT: UPDATE BILLING SETTINGS
# ============================================

@router.put("/billing-settings")
async def update_billing_settings(settings: dict):
    """Update billing settings (VAT and discount)"""
    try:
        vat = settings.get("vat")
        discount = settings.get("discount")
        
        if vat is None or discount is None:
            raise HTTPException(status_code=400, detail="VAT and discount are required")
        
        # Check if settings exist
        existing_result = await asyncio.to_thread(
            lambda: supabase.table("billing_settings")
            .select("*")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        
        update_data = {
            "vat": float(vat),
            "discount": float(discount),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_result.data:
            # Update existing settings
            result = await asyncio.to_thread(
                lambda: supabase.table("billing_settings")
                .update(update_data)
                .eq("id", existing_result.data[0]["id"])
                .execute()
            )
            updated_data = result.data[0]
        else:
            # Insert new settings
            result = await asyncio.to_thread(
                lambda: supabase.table("billing_settings")
                .insert(update_data)
                .execute()
            )
            updated_data = result.data[0]
        
        # Invalidate cache immediately
        CacheManager.invalidate_billing_settings_cache()
        
        logging.info(f"✅ Billing settings updated: VAT={vat}%, Discount={discount}%")
        
        return {
            "success": True,
            "data": {
                "id": updated_data.get("id"),
                "vat": float(updated_data["vat"]),
                "discount": float(updated_data["discount"]),
                "updated_at": updated_data.get("updated_at")
            },
            "message": "Billing settings updated successfully"
        }
        
    except Exception as e:
        logging.error(f"Error updating billing settings: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to update billing settings: {str(e)}")

# ============================================
# ENDPOINT: CALCULATE BILLING AMOUNT
# ============================================

@router.post("/calculate-billing")
async def calculate_billing_amount(data: dict):
    """Calculate total billing amount based on current settings"""
    try:
        room_price = data.get("room_price")
        nights = data.get("nights")
        
        if not room_price or not nights:
            raise HTTPException(status_code=400, detail="room_price and nights are required")
        
        # Get current billing settings
        settings_result = await asyncio.to_thread(
            lambda: supabase.table("billing_settings")
            .select("*")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        
        if not settings_result.data:
            # Use default values
            vat_rate = 13.0
            discount_rate = 0.0
        else:
            settings = settings_result.data[0]
            vat_rate = float(settings["vat"])
            discount_rate = float(settings["discount"])
        
        # Calculate amounts
        base_amount = float(room_price) * int(nights)
        discount_amount = base_amount * (discount_rate / 100)
        discounted_amount = base_amount - discount_amount
        vat_amount = discounted_amount * (vat_rate / 100)
        total_amount = discounted_amount + vat_amount
        
        return {
            "success": True,
            "calculation": {
                "base_amount": base_amount,
                "discount_rate": discount_rate,
                "discount_amount": discount_amount,
                "vat_rate": vat_rate,
                "vat_amount": vat_amount,
                "total_amount": total_amount
            }
        }
        
    except Exception as e:
        logging.error(f"Error calculating billing: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to calculate billing: {str(e)}")