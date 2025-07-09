from pydantic import BaseModel, EmailStr, model_validator
from datetime import date
from typing import Optional

class Booking(BaseModel):
    check_in: date
    check_out: date
    guests: int
    room_number: str
    room_type: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: int
    status: Optional[str] = "Confirmed"
    source: Optional[str] = "Direct"

    @model_validator(mode="after")
    def validate_dates(self) -> 'Booking':
        if self.check_out <= self.check_in:
            raise ValueError("Check-out must be after check-in.")
        return self

class BookingUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[int] = None
    guests: Optional[int] = None
    check_in: Optional[date] = None
    check_out: Optional[date] = None
    room_number: Optional[str] = None
    room_type: Optional[str] = None
