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
    status: Optional[str] = "Confirmed"  # Default if not passed
    source: Optional[str] = "Direct"     # Default source

    @model_validator(mode="after")
    def validate_dates(self) -> 'Booking':
        if self.check_out <= self.check_in:
            raise ValueError("Check-out must be after check-in.")
        return self
