"""Simple rate limiting based on job count per user in the last 24 hours."""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException

from utils.auth import require_auth
from utils.supabase_client import supabase

DAILY_JOB_LIMIT = 10


async def check_rate_limit(user_id: str = Depends(require_auth)) -> str:
    """Dependency that enforces daily job limits. Returns user_id if allowed."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    result = (
        supabase.table("jobs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", cutoff)
        .execute()
    )

    count = result.count if result.count is not None else len(result.data)

    if count >= DAILY_JOB_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {DAILY_JOB_LIMIT} mods per day. Try again later.",
        )

    return user_id
