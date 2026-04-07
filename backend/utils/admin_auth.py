"""FastAPI dependency for admin-only routes."""
import time

from fastapi import Depends, HTTPException

from utils.auth import require_auth
from utils.supabase_client import supabase

# Simple TTL cache: {user_id: (is_admin, timestamp)}
_admin_cache: dict[str, tuple[bool, float]] = {}
_CACHE_TTL = 300  # 5 minutes


async def require_admin(user_id: str = Depends(require_auth)) -> str:
    """Require authenticated user with is_admin=true. Returns user_id."""
    now = time.monotonic()
    cached = _admin_cache.get(user_id)
    if cached and (now - cached[1]) < _CACHE_TTL:
        if not cached[0]:
            raise HTTPException(status_code=403, detail="Admin access required")
        return user_id

    result = (
        supabase.table("user_profiles")
        .select("is_admin")
        .eq("id", user_id)
        .execute()
    )

    is_admin = bool(result.data and result.data[0].get("is_admin"))
    _admin_cache[user_id] = (is_admin, now)

    if not is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")

    return user_id
