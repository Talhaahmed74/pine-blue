from pydantic import BaseModel, EmailStr, model_validator, Field
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
    user_id: Optional[int] = None  # Link to users table
    special_requests: Optional[str] = None

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
    special_requests: Optional[str] = None

# New model for frontend booking requests
class FrontendBookingRequest(BaseModel):
    room_type_id: int
    user_id: int
    guest_name: str
    guest_email: EmailStr
    guest_phone: Optional[str] = ""
    check_in: str  # Will be converted to date
    check_out: str  # Will be converted to date
    total_amount: float
    special_requests: Optional[str] = ""
    status: Optional[str] = "confirmed"

    @model_validator(mode="after")
    def validate_dates(self) -> 'FrontendBookingRequest':
        from datetime import datetime
        try:
            check_in_date = datetime.fromisoformat(self.check_in).date()
            check_out_date = datetime.fromisoformat(self.check_out).date()
            if check_out_date <= check_in_date:
                raise ValueError("Check-out must be after check-in.")
        except ValueError as e:
            if "Check-out must be after check-in" in str(e):
                raise e
            raise ValueError("Invalid date format. Use YYYY-MM-DD format.")
        return self

    @model_validator(mode="after")
    def validate_guest_name(self) -> 'FrontendBookingRequest':
        if not self.guest_name or len(self.guest_name.strip()) < 2:
            raise ValueError("Guest name must be at least 2 characters long.")
        return self

    @model_validator(mode="after")
    def validate_total_amount(self) -> 'FrontendBookingRequest':
        if self.total_amount <= 0:
            raise ValueError("Total amount must be greater than 0.")
        return self

# Response model for booking creation
class BookingResponse(BaseModel):
    success: bool
    booking_id: str
    room_number: str
    total_amount: float
    message: str

# Model for booking details with user info
class BookingWithUser(BaseModel):
    booking_id: str
    check_in: date
    check_out: date
    guests: int
    room_number: str
    room_type: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: int
    status: str
    source: str
    user_id: Optional[int] = None
    special_requests: Optional[str] = None
    created_at: str
    updated_at: Optional[str] = None
    is_updated: bool = False
