from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import bookings, rooms, dashboard, room_type, login, billing, notifications, availability_routes
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Hotel Management API", 
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers - IMPORTANT: Order matters!
# ⚠️ Check each router file to see if it already has route prefixes defined
app.include_router(availability_routes.router, prefix="/availability", tags=['Availability'])
app.include_router(bookings.router, tags=["bookings"])  # Remove prefix if bookings.router already defines /bookings
app.include_router(rooms.router, tags=["rooms"])  # Remove prefix if rooms.router already defines /rooms
app.include_router(dashboard.router, tags=["dashboard"])
app.include_router(room_type.router, tags=["room-types"])
app.include_router(login.router, tags=["login"])
app.include_router(billing.router, tags=["billing"])
app.include_router(notifications.router, prefix="/api/notifications", tags=['notifications'])

@app.get("/")
def read_root():
    return {
        "message": "Hotel Management API v2.0",
        "status": "running",
        "endpoints": {
            "availability": "/availability/*",
            "bookings": "/bookings/*",
            "rooms": "/rooms/*",
            "dashboard": "/dashboard/*",
            "room_types": "/room-types/*",
            "auth": "/auth/*",
            "billing": "/billing/*",
            "notifications": "/api/notifications/*",
            "docs": "/docs",
            "redoc": "/redoc"
        }
    }

@app.get("/health")
def health_check():
    """Health check endpoint for monitoring"""
    return {"status": "healthy", "version": "2.0.0"}

# Log all routes on startup
@app.on_event("startup")
async def startup_event():
    logger.info("🚀 Application starting up...")
    logger.info("📋 Available routes:")
    for route in app.routes:
        if hasattr(route, "methods"):
            logger.info(f"  {list(route.methods)[0]:6} {route.path}")
    logger.info("✅ Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("🛑 Application shutting down...")