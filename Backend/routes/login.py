from fastapi import APIRouter, HTTPException
from models.log import LoginRequest, LoginResponse, User
from supabase_client import supabase
import logging

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(login_data: LoginRequest):
    """Simple login endpoint for customer bookings"""
    try:
        # Check if user exists in the users table
        user_result = supabase.table("users").select("*").eq("email", login_data.email).execute()
        
        if not user_result.data:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user = user_result.data[0]
        
        # Simple password check (in production, use proper hashing)
        if user["password"] != login_data.password:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        return LoginResponse(
            success=True,
            message="Login successful",
            user_id=user["id"],
            email=user["email"],
            name=user["name"]
        )
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@router.get("/user/{user_id}", response_model=User)
def get_user(user_id: int):
    """Get user details by ID"""
    try:
        user_result = supabase.table("users").select("*").eq("id", user_id).execute()
        
        if not user_result.data:
            raise HTTPException(status_code=404, detail="User not found")
        
        user = user_result.data[0]
        return User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            phone=user.get("phone"),
            created_at=user["created_at"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
