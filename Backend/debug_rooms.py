#!/usr/bin/env python3

import os
from supabase import create_client, Client

# Initialize Supabase client
supabase_url = os.environ.get("SUPABASE_URL")
supabase_key = os.environ.get("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    print("❌ Please set SUPABASE_URL and SUPABASE_KEY environment variables")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_key)

def debug_rooms_and_types():
    print("🔍 Debugging Room Types and Rooms...")
    print("=" * 50)
    
    # Get room types
    try:
        room_types_result = supabase.table("room_types").select("*").execute()
        room_types = room_types_result.data
        
        print(f"📋 Found {len(room_types)} room types:")
        for rt in room_types:
            print(f"   - ID: {rt['id']}, Name: '{rt['name']}', Available: {rt['is_available']}")
        
        print("\n" + "=" * 50)
        
        # Get rooms
        rooms_result = supabase.table("rooms").select("*").execute()
        rooms = rooms_result.data
        
        print(f"🏨 Found {len(rooms)} rooms:")
        for room in rooms:
            print(f"   - Number: {room['room_number']}, Type: '{room['room_type']}', Status: {room['status']}")
        
        print("\n" + "=" * 50)
        
        # Check matching
        room_type_names = [rt["name"] for rt in room_types]
        room_types_in_rooms = list(set([r["room_type"] for r in rooms]))
        
        print("🔗 Room Type Matching Analysis:")
        print(f"Room type names: {room_type_names}")
        print(f"Room types in rooms table: {room_types_in_rooms}")
        
        # Check for mismatches
        mismatches = []
        for room_type_name in room_type_names:
            exact_match = any(rt == room_type_name for rt in room_types_in_rooms)
            case_insensitive_match = any(rt.lower() == room_type_name.lower() for rt in room_types_in_rooms)
            
            if not exact_match:
                if case_insensitive_match:
                    mismatches.append(f"Case mismatch: '{room_type_name}' vs rooms table")
                else:
                    mismatches.append(f"No match found for: '{room_type_name}'")
        
        if mismatches:
            print("\n⚠️  ISSUES FOUND:")
            for mismatch in mismatches:
                print(f"   - {mismatch}")
        else:
            print("\n✅ All room types match!")
            
        # Check available rooms for each type
        print("\n" + "=" * 50)
        print("🏨 Available Rooms by Type:")
        
        for rt in room_types:
            if rt['is_available']:
                available_rooms = [r for r in rooms if r['room_type'].lower() == rt['name'].lower() and r['status'] == 'Available']
                print(f"   - {rt['name']}: {len(available_rooms)} available rooms")
                for room in available_rooms:
                    print(f"     * {room['room_number']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    debug_rooms_and_types()
