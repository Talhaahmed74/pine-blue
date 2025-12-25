from pydantic import BaseModel, Field
from typing import List, Literal, Optional

class Room(BaseModel):
    room_number: str
    room_type: str
    status: Literal["Available", "Occupied", "Maintenance", "Booked"]
    price: float
    capacity: int
    floor: int
    amenities: List[str]

class RoomCreate(BaseModel):
    room_number: str
    room_type: str  # This will be the room type name, we'll convert to ID in the backend
    status: Literal["Available", "Occupied", "Maintenance"] = "Available"
    floor: int

class RoomUpdate(BaseModel):
    status: Literal["Available", "Occupied", "Maintenance"]

class RoomResponse(BaseModel):
    room_number: str
    room_type: str
    status: str
    price: float
    capacity: int
    floor: int
    amenities: List[str]
    room_type_id: int
