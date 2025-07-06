from pydantic import BaseModel, field_validator
from typing import Optional, Literal

class Billing(BaseModel):
    booking_id: str
    room_price: float
    discount: Optional[float] = 0.0
    vat: float  
    payment_method: Literal["Cash", "Card", "Online"]
    payment_status: Literal["Paid", "Pending"]

    @field_validator("discount")
    def validate_discount(cls, v):
        if v < 0 or v > 100:
            raise ValueError("Discount must be between 0 and 100")
        return v

    @field_validator("vat")
    def validate_vat(cls, v):
        if v < 0 or v > 20:
            raise ValueError("VAT must be between 0 and 20")
        return v