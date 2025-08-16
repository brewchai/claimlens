import os, json, asyncio
import aioredis

REDIS_URL = os.getenv("REDIS_URL")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "604800"))

redis = None

async def get_redis():
    global redis
    if redis is None and REDIS_URL:
        redis = await aioredis.from_url(REDIS_URL, decode_responses=True)
    return redis

async def cache_get(key: str):
    r = await get_redis()
    if not r: return None
    return await r.get(key)

async def cache_set(key: str, val: dict, ttl: int = CACHE_TTL):
    r = await get_redis()
    if not r: return
    await r.set(key, json.dumps(val), ex=ttl)