from fastapi import APIRouter, HTTPException
from models.billing import Billing, BillingUpdate
from supabase_client import supabase
from datetime import datetime
from typing import Optional
import logging

router = APIRouter()
logging.basicConfig(level=logging.INFO)

# ADD BILLING SETTINGS ENDPOINTS
@router.get("/billing-settings")
async def get_billing_settings():
    """Get current billing settings (VAT and discount)"""
    try:
        result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()
        
        if not result.data:
            # Create default settings if none exist
            default_settings = {
                "vat": 13.0,
                "discount": 0.0,
                "updated_at": datetime.utcnow().isoformat()
            }
            
            insert_result = supabase.table("billing_settings").insert(default_settings).execute()
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

@router.put("/billing-settings")
async def update_billing_settings(settings: dict):
    """Update billing settings (VAT and discount)"""
    try:
        vat = settings.get("vat")
        discount = settings.get("discount")
        
        if vat is None or discount is None:
            raise HTTPException(status_code=400, detail="VAT and discount are required")
        
        # Check if settings exist
        existing_result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()
        
        update_data = {
            "vat": float(vat),
            "discount": float(discount),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        if existing_result.data:
            # Update existing settings
            result = supabase.table("billing_settings").update(update_data).eq("id", existing_result.data[0]["id"]).execute()
            updated_data = result.data[0]
        else:
            # Insert new settings
            result = supabase.table("billing_settings").insert(update_data).execute()
            updated_data = result.data[0]
        
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

@router.post("/calculate-billing")
async def calculate_billing_amount(data: dict):
    """Calculate total billing amount based on current settings"""
    try:
        room_price = data.get("room_price")
        nights = data.get("nights")
        
        if not room_price or not nights:
            raise HTTPException(status_code=400, detail="room_price and nights are required")
        
        # Get current billing settings
        settings_result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()
        
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

@router.post("/billing")
async def create_billing_record(billing_data: dict):
    """Create a new billing record with current settings and confirm booking"""
    try:
        booking_id = billing_data.get("booking_id")
        room_price = billing_data.get("room_price")
        payment_method = billing_data.get("payment_method", "pending")
        payment_status = billing_data.get("payment_status", "pending")
        
        if not booking_id or not room_price:
            raise HTTPException(status_code=400, detail="booking_id and room_price are required")
        
        # Get current billing settings
        settings_result = supabase.table("billing_settings").select("*").order("id", desc=True).limit(1).execute()
        
        if not settings_result.data:
            # Use default values
            vat_rate = 13.0
            discount_rate = 0.0
        else:
            settings = settings_result.data[0]
            vat_rate = float(settings["vat"])
            discount_rate = float(settings["discount"])
        
        # Get booking details to calculate nights
        booking_result = supabase.table("bookings").select("*").eq("booking_id", booking_id).execute()
        if not booking_result.data:
            raise HTTPException(status_code=404, detail="Booking not found")
        
        booking = booking_result.data[0]
        check_in = datetime.fromisoformat(booking["check_in"]).date()
        check_out = datetime.fromisoformat(booking["check_out"]).date()
        nights = (check_out - check_in).days or 1
        
        # Calculate amounts
        base_amount = float(room_price) * nights
        discount_amount = base_amount * (discount_rate / 100)
        discounted_amount = base_amount - discount_amount
        vat_amount = discounted_amount * (vat_rate / 100)
        total_amount = discounted_amount + vat_amount
        
        # Insert billing record
        billing_insert_data = {
            "booking_id": booking_id,
            "room_price": float(room_price),
            "discount": discount_rate,
            "vat": vat_rate,
            "total_amount": total_amount,
            "payment_method": payment_method,
            "payment_status": payment_status,
            "is_cancelled": False,
            "created_at": datetime.utcnow().isoformat()
        }
        
        result = supabase.table("billing").insert(billing_insert_data).execute()
        
        # Confirm the booking and mark room as occupied
        supabase.table("bookings").update({
            "status": "confirmed",
            "updated_at": datetime.utcnow().isoformat()
        }).eq("booking_id", booking_id).execute()
        
        # Mark room as occupied
        supabase.table("rooms").update({"status": "Occupied"}).eq("room_number", booking["room_number"]).execute()
        
        logging.info(f"✅ Billing record created for booking {booking_id} and booking confirmed")
        
        return {
            "success": True,
            "billing_id": result.data[0]["id"],
            "total_amount": total_amount,
            "message": "Billing record created and booking confirmed successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating billing record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create billing record: {str(e)}")

@router.get("/billing/{booking_id}")
async def get_billing_by_booking(booking_id: str):
    """Get billing information for a specific booking"""
    try:
        result = supabase.table("billing").select("*").eq("booking_id", booking_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Billing record not found")
        
        return result.data[0]
        
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching billing record: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch billing record: {str(e)}")
