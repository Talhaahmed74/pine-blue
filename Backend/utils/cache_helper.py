# utils/cache_helper.py
import json
import logging
from typing import Any, Optional, List
from datetime import datetime, timedelta
from utils.redis_client import r
from supabase_client import supabase
import asyncio

logger = logging.getLogger(__name__)

class CacheManager:
    """Centralized cache management with event-driven invalidation"""
    
    # Cache key patterns
    ROOM_STATS_KEY = "room_stats"
    ROOMS_LIST_KEY = "rooms_list:{offset}:{limit}"
    ROOM_DETAIL_KEY = "room:{room_number}"
    ROOM_AVAILABILITY_KEY = "room_availability:{room_type}:{check_in}:{check_out}"
    AVAILABLE_ROOM_TYPES_KEY = "available_room_types:{check_in}:{check_out}"
    USER_DASHBOARD_KEY = "user_dashboard:{user_id}"
        # Add new cache keys
    BILLING_SETTINGS_KEY = "billing_settings"
    
    
    # Cache expiration times (in seconds)
    DEFAULT_TTL = 120  # 2 minutes
    ROOM_STATS_TTL = 60  # 1 minute
    AVAILABILITY_TTL = 180  # 3 minutes
    USER_DASHBOARD_TTL = 600  # 10 minutes
    BILLING_SETTINGS_TTL = 86400  # 24 hours

    
    @staticmethod
    def get_cache(key: str) -> Optional[Any]:
        """Get data from cache"""
        try:
            cached_data = r.get(key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logger.warning(f"Cache get failed for key {key}: {e}")
        return None
    
    @staticmethod
    def set_cache(key: str, data: Any, ttl: int = DEFAULT_TTL) -> bool:
        """Set data in cache with TTL"""
        try:
            r.setex(key, ttl, json.dumps(data, default=str))
            return True
        except Exception as e:
            logger.warning(f"Cache set failed for key {key}: {e}")
            return False
    
    @staticmethod
    def delete_cache(key: str) -> bool:
        """Delete specific cache key"""
        try:
            r.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete failed for key {key}: {e}")
            return False
    
    @staticmethod
    def delete_pattern(pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            keys = r.keys(pattern)
            if keys:
                return r.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache pattern delete failed for pattern {pattern}: {e}")
            return 0
    
    @staticmethod
    async def get_or_refresh_cache(key: str, ttl: int, fetch_func):
        """
        Get from cache, or refresh asynchronously if stale/missing.
        fetch_func should be an async function returning fresh data.
        """
        cached = CacheManager.get_cache(key)
        if cached:
            # background refresh if TTL about to expire
            asyncio.create_task(fetch_func())
            return cached
        # no cache → wait for fresh data
        data = await fetch_func()
        CacheManager.set_cache(key, data, ttl)
        return data

    
    @staticmethod
    def invalidate_room_related_cache(room_number: Optional[str] = None, room_type: Optional[str] = None):
        """Invalidate only affected room-related cache entries"""
        cleared_count = 0

        if room_number:
            cleared_count += CacheManager.delete_cache(f"room:{room_number}")
            cleared_count += CacheManager.delete_pattern(f"room_search:*{room_number}*")

        if room_type:
            cleared_count += CacheManager.delete_pattern(f"room_availability:{room_type}:*")
        
        # Always clear room stats (small, cheap cache)
        cleared_count += CacheManager.delete_cache("room_stats")

        logger.info(f"Cleared {cleared_count} selective room-related cache entries")
        return cleared_count

    
    @staticmethod
    def invalidate_user_cache(user_id: int = None, email: str = None):
        """Invalidate user-specific cache"""
        patterns_to_clear = []
        
        if user_id:
            patterns_to_clear.append(f"user_dashboard:{user_id}")
        
        if email:
            patterns_to_clear.append(f"user_dashboard:email:{email}")
        
        # Also clear general user dashboard patterns
        patterns_to_clear.append("user_dashboard:*")
        
        cleared_count = 0
        for pattern in patterns_to_clear:
            cleared_count += CacheManager.delete_pattern(pattern)
        
        logger.info(f"Cleared {cleared_count} user cache entries")
        return cleared_count
    
    @staticmethod
    def invalidate_booking_related_cache(room_number: str = None, user_id: int = None):
        """Invalidate cache when booking changes"""
        # Always clear room stats and availability
        CacheManager.invalidate_room_related_cache(room_number=room_number)
        
        # Clear user-specific cache if user_id provided
        if user_id:
            CacheManager.invalidate_user_cache(user_id=user_id)
        
        # Clear specific room cache if room_number provided
        if room_number:
            CacheManager.delete_cache(f"room:{room_number}")
        
        logger.info(f"Invalidated booking-related cache for room: {room_number}, user: {user_id}")


    @staticmethod
    def invalidate_billing_settings_cache():
        """Invalidate billing settings cache when settings are updated"""
        CacheManager.delete_cache(CacheManager.BILLING_SETTINGS_KEY)
        logger.info("Invalidated billing settings cache")

# Decorator for automatic cache invalidation
def invalidate_cache_on_booking_change(func):
    """Decorator to automatically invalidate cache after booking operations"""
    def wrapper(*args, **kwargs):
        result = func(*args, **kwargs)
        
        # Extract room_number and user_id from function arguments or result
        room_number = None
        user_id = None
        
        # Try to extract from kwargs
        if 'room_number' in kwargs:
            room_number = kwargs['room_number']
        if 'user_id' in kwargs:
            user_id = kwargs['user_id']
            
        # Try to extract from booking_request if it exists
        if hasattr(args[0] if args else None, 'user_id'):
            user_id = args[0].user_id
            
        # If result is a BookingResponse, extract room_number
        if hasattr(result, 'room_number'):
            room_number = result.room_number
            
        CacheManager.invalidate_booking_related_cache(room_number, user_id)
        
        return result
    return wrapper

# Add this helper function for billing settings
async def get_billing_settings_cached() -> dict:
    """
    Get billing settings from cache or database
    Returns: dict with 'vat' and 'discount' keys
    """
    try:
        # Try to get from cache first
        cached_settings = CacheManager.get_cache(CacheManager.BILLING_SETTINGS_KEY)
        if cached_settings:
            logger.info("✅ Billing settings loaded from cache")
            return cached_settings
        
        # If not in cache, fetch from database
        settings_result = await asyncio.to_thread(
            lambda: supabase.table("billing_settings")
            .select("*")
            .order("id", desc=True)
            .limit(1)
            .execute()
        )
        
        if settings_result.data:
            settings = {
                "vat": float(settings_result.data[0]["vat"]),
                "discount": float(settings_result.data[0]["discount"])
            }
        else:
            # Default values if no settings found
            settings = {"vat": 13.0, "discount": 0.0}
        
        # Cache the settings for 24 hours
        CacheManager.set_cache(
            CacheManager.BILLING_SETTINGS_KEY,
            settings,
            CacheManager.BILLING_SETTINGS_TTL
        )
        
        logger.info("✅ Billing settings loaded from DB and cached")
        return settings
        
    except Exception as e:
        logger.error(f"Error getting billing settings: {e}")
        # Return default values on error
        return {"vat": 13.0, "discount": 0.0}