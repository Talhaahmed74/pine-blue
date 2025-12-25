# models/booking.py - Updated with check-in/out time fields
from pydantic import BaseModel, EmailStr, model_validator, Field
from datetime import date, time
from typing import Optional, Literal

class Booking(BaseModel):
    check_in: date
    check_out: date
    check_in_time: Optional[str] = "12:00"  # Default check-in time
    check_out_time: Optional[str] = "12:00"  # Default check-out time
    guests: int
    room_number: str
    room_type: str
    first_name: str
    last_name: str
    email: EmailStr
    phone: int
    status: Optional[str] = "pending"
    source: Optional[str] = "Direct"
    user_id: Optional[int] = None
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
    check_in_time: Optional[str] = None
    check_out_time: Optional[str] = None
    room_number: Optional[str] = None
    room_type: Optional[str] = None
    special_requests: Optional[str] = None
    status: Optional[Literal["pending", "confirmed", "cancelled", "completed", "checked_in", "checked_out"]] = None

# Frontend booking request model for customers
class FrontendBookingRequest(BaseModel):
    room_type_id: int
    user_id: int
    guest_name: str
    guest_email: EmailStr
    guest_phone: Optional[str] = ""
    check_in: str  # Will be converted to date
    check_out: str  # Will be converted to date
    check_in_time: Optional[str] = "12:00"  # Default to noon
    total_amount: float
    special_requests: Optional[str] = ""
    status: Optional[str] = "pending"  # Always pending for customer bookings
    guests: Optional[int] = 2

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
    def validate_check_in_time(self) -> 'FrontendBookingRequest':
        if self.check_in_time:
            from datetime import datetime
            try:
                datetime.strptime(self.check_in_time, "%H:%M")
            except ValueError:
                raise ValueError("Invalid check-in time format. Use HH:MM format (e.g., 14:00)")
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

# Admin booking request model
class AdminBookingRequest(BaseModel):
    room_type_id: int
    room_number: Optional[str] = None  # Admin can specify room number
    user_id: Optional[int] = None  # Optional for walk-ins
    guest_name: str
    guest_email: EmailStr
    guest_phone: Optional[str] = ""
    check_in: str
    check_out: str
    check_in_time: Optional[str] = None  # Will use current time for today's bookings, default for future
    check_out_time: Optional[str] = "12:00"  # Default checkout at noon
    total_amount: Optional[float] = 0
    special_requests: Optional[str] = ""
    status: Optional[Literal["pending", "confirmed", "cancelled"]] = "confirmed"
    guests: Optional[int] = 2
    payment_method: Optional[Literal["Cash", "Card", "Online", "Admin"]] = "Admin"
    payment_status: Optional[Literal["Paid", "Pending"]] = "Pending"

    @model_validator(mode="after")
    def validate_dates(self) -> 'AdminBookingRequest':
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
    def validate_check_in_time(self) -> 'AdminBookingRequest':
        if self.check_in_time:
            from datetime import datetime
            try:
                datetime.strptime(self.check_in_time, "%H:%M")
            except ValueError:
                raise ValueError("Invalid check-in time format. Use HH:MM format (e.g., 14:00)")
        return self

# Response models
class BookingResponse(BaseModel):
    success: bool
    booking_id: str
    room_number: str
    total_amount: float
    message: str
    status: Optional[str] = None

class BookingWithUser(BaseModel):
    booking_id: str
    check_in: date
    check_out: date
    check_in_time: Optional[str] = "12:00"
    check_out_time: Optional[str] = "12:00"
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

# Booking cancellation request
class BookingCancellationRequest(BaseModel):
    booking_id: str
    reason: Optional[str] = None

# Booking status update request
class BookingStatusUpdate(BaseModel):
    status: Literal["pending", "confirmed", "cancelled", "completed", "checked_in", "checked_out"]
    notes: Optional[str] = None