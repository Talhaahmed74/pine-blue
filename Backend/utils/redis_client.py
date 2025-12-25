# utils/redis_client.py
import os
import redis
import logging

logger = logging.getLogger(__name__)

r = None  # global redis client (optional)

def init_redis():
    global r

    redis_url = os.getenv("REDIS_URL")

    if not redis_url:
        logger.warning("⚠️ REDIS_URL not set. Redis disabled.")
        r = None
        return None

    try:
        r = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_timeout=5,
        )
        r.ping()  # verify connection
        logger.info("✅ Redis connected successfully")
    except Exception as e:
        logger.error(f"❌ Redis unavailable. Continuing without cache. Reason: {e}")
        r = None

    return r
