"""FastAPI dependency for admin-only routes."""
from fastapi import Depends, HTTPException

from utils.auth import require_auth
from utils.supabase_client import supabase


async def require_admin(user_id: str = Depends(require_auth)) -> str:
    """Require authenticated user with is_admin=true. Returns user_id."""
    result = (
        supabase.table("user_profiles")
        .select("is_admin")
        .eq("id", user_id)
        .execute()
    )

    if not result.data or not result.data[0].get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    return user_id
