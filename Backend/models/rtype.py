from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class RoomTypeBase(BaseModel):
    name: str
    base_price: float = Field(gt=0, description="Base price must be greater than 0")
    is_available: bool = True
    amenities: List[str]
    max_adults: int = Field(gt=0, description="Max adults must be greater than 0")
    max_children: int = Field(ge=0, description="Max children must be 0 or greater")

class RoomTypeCreate(RoomTypeBase):
    pass

class RoomTypeUpdate(BaseModel):
    name: Optional[str] = None
    base_price: Optional[float] = Field(None, gt=0)
    is_available: Optional[bool] = None
    amenities: Optional[List[str]] = None
    max_adults: Optional[int] = Field(None, gt=0)
    max_children: Optional[int] = Field(None, ge=0)

class RoomType(RoomTypeBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class RoomTypeResponse(BaseModel):
    id: int
    name: str
    base_price: float
    is_available: bool
    amenities: List[str]
    max_adults: int
    max_children: int
    total_capacity: int
    created_at: datetime
    updated_at: Optional[datetime] = None
