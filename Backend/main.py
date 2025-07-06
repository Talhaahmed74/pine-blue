from fastapi import FastAPI
from routes import bookings
from routes import rooms
from routes import dashboard
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

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

app.include_router(bookings.router)
app.include_router(rooms.router)
app.include_router(dashboard.router) 