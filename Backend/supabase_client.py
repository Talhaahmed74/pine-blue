from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()  # loads from .env

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
EDGE_FUNCTION_URL = os.getenv("EDGE_FUNCTION_URL")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
