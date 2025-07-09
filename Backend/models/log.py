from pydantic import BaseModel, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    success: bool
    message: str
    user_id: Optional[int] = None
    email: Optional[str] = None
    name: Optional[str] = None

class User(BaseModel):
    id: int
    email: str
    name: str
    phone: Optional[str] = None
    created_at: str
