from pydantic import BaseModel, field_validator
from typing import Optional, Literal

class Billing(BaseModel):
    booking_id: str
    room_price: float
    discount: Optional[float] = 0.0
    vat: float = 13.0  # Default VAT rate
    total_amount: float
    payment_method: Literal["Cash", "Card", "Online"] = "Online"
    payment_status: Literal["Paid", "Pending"] = "Paid"
    is_cancelled: Optional[bool] = False
    cancelled_at: Optional[str] = None

    @field_validator("discount")
    @classmethod
    def validate_discount(cls, v):
        if v < 0 or v > 100:
            raise ValueError("Discount must be between 0 and 100")
        return v

    @field_validator("vat")
    @classmethod
    def validate_vat(cls, v):
        if v < 0 or v > 30:  # Increased max VAT to 30%
            raise ValueError("VAT must be between 0 and 30")
        return v

    @field_validator("total_amount")
    @classmethod
    def validate_total_amount(cls, v):
        if v <= 0:
            raise ValueError("Total amount must be greater than 0")
        return v

    @field_validator("room_price")
    @classmethod
    def validate_room_price(cls, v):
        if v <= 0:
            raise ValueError("Room price must be greater than 0")
        return v

# Update model for billing
class BillingUpdate(BaseModel):
    room_price: Optional[float] = None
    discount: Optional[float] = None
    vat: Optional[float] = None
    total_amount: Optional[float] = None
    payment_method: Optional[Literal["Cash", "Card", "Online"]] = None
    payment_status: Optional[Literal["Paid", "Pending"]] = None

    @field_validator("discount")
    @classmethod
    def validate_discount(cls, v):
        if v is not None and (v < 0 or v > 100):
            raise ValueError("Discount must be between 0 and 100")
        return v

    @field_validator("vat")
    @classmethod
    def validate_vat(cls, v):
        if v is not None and (v < 0 or v > 30):
            raise ValueError("VAT must be between 0 and 30")
        return v

# Response model for billing operations
class BillingResponse(BaseModel):
    booking_id: str
    total_amount: float
    payment_status: str
    message: str
