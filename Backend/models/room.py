from pydantic import BaseModel, Field
from typing import List, Literal

class Room(BaseModel):
    room_number: str
    room_type: str = Field(alias="type")
    status: Literal["Available", "Occupied", "Maintenance", "Cleaning","Booked"]
    price: int
    capacity: int
    floor: int
    amenities: List[str]