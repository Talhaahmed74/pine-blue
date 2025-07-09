from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from routes import bookings
from routes import rooms
from routes import dashboard
from routes import room_type
from routes import login

app = FastAPI(title="Hotel Management API", version="1.0.0")

origins = [
    'http://localhost:8080/',
    '127.0.0.1:55253'
]

# Allow local frontend calls from React
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # Replace "*" with frontend URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(bookings.router, tags=["bookings"])
app.include_router(rooms.router, tags=["rooms"])
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(room_type.router, tags=["room-types"])
app.include_router(login.router, tags=["login"])

# Mount static files (commented out to prevent errors if Frontend directory doesn't exist)
# Uncomment the line below if you have a Frontend directory in your backend folder
# app.mount("/", StaticFiles(directory="Frontend", html=True), name="static")

@app.get("/")
def read_root():
    return {"message": "Hotel Management API is running!", "version": "1.0.0"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "FastAPI server is running"}