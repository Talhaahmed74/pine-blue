import redis
import os

r = redis.Redis.from_url(os.environ["REDIS_URL"], decode_responses=True)

r.set('foo', 'bar')
value = r.get('foo')