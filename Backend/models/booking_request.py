from pydantic import BaseModel
from models.booking import Booking
from models.billing import Billing

class BookingRequest(BaseModel):
    booking: Booking
    billing: Billing
