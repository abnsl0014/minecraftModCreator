"""Tier-based rate limiting on job count per user in the last 24 hours."""
from datetime import datetime, timedelta, timezone

from fastapi import Depends, HTTPException

from utils.auth import require_auth
from utils.supabase_client import supabase

TIER_DAILY_LIMITS = {
    "free": 10,
    "basic": 50,
    "unlimited": 500,
}


async def check_rate_limit(user_id: str = Depends(require_auth)) -> str:
    """Dependency that enforces tier-based daily job limits. Returns user_id if allowed."""
    # Get user tier
    profile = supabase.table("user_profiles").select("tier").eq("id", user_id).execute()
    tier = profile.data[0].get("tier", "free") if profile.data else "free"
    daily_limit = TIER_DAILY_LIMITS.get(tier, 10)

    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()

    result = (
        supabase.table("jobs")
        .select("id", count="exact")
        .eq("user_id", user_id)
        .gte("created_at", cutoff)
        .execute()
    )

    count = result.count if result.count is not None else len(result.data)

    if count >= daily_limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. Maximum {daily_limit} mods per day for {tier} tier. Try again later.",
        )

    return user_id
