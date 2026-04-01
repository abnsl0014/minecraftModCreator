"""Database operations for mod submissions."""
import logging
from typing import Optional

from utils.supabase_client import supabase

logger = logging.getLogger(__name__)


async def create_submission(
    user_id: str,
    title: str,
    description: str,
    edition: str,
    category: str,
    download_url: str,
    tags: list[str] | None = None,
    screenshots: list[str] | None = None,
    video_url: str | None = None,
    crafting_recipe: dict | None = None,
    survival_guide: str | None = None,
    job_id: str | None = None,
) -> dict:
    """Insert a new submission. Returns the created row."""
    data = {
        "user_id": user_id,
        "title": title,
        "description": description,
        "edition": edition,
        "category": category,
        "download_url": download_url,
        "tags": tags or [],
        "screenshots": screenshots or [],
        "video_url": video_url,
        "crafting_recipe": crafting_recipe,
        "survival_guide": survival_guide,
        "job_id": job_id,
        "status": "pending",
    }
    result = supabase.table("mod_submissions").insert(data).execute()
    return result.data[0]


async def get_submission(submission_id: str) -> Optional[dict]:
    """Get a single submission by ID."""
    result = (
        supabase.table("mod_submissions")
        .select("*")
        .eq("id", submission_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def get_user_submissions(
    user_id: str, limit: int = 20, offset: int = 0
) -> list[dict]:
    """Get all submissions by a user."""
    result = (
        supabase.table("mod_submissions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )
    return result.data


async def get_approved_submissions(
    sort: str = "recent",
    edition: str = "all",
    category: str = "all",
    limit: int = 20,
    offset: int = 0,
) -> list[dict]:
    """Get approved submissions for public gallery."""
    query = (
        supabase.table("mod_submissions")
        .select("*")
        .eq("status", "approved")
    )

    if edition != "all":
        query = query.eq("edition", edition)
    if category != "all":
        query = query.eq("category", category)

    if sort == "downloads":
        query = query.order("download_count", desc=True)
    elif sort == "featured":
        query = query.order("featured", desc=True).order("created_at", desc=True)
    else:
        query = query.order("created_at", desc=True)

    query = query.range(offset, offset + limit - 1)
    result = query.execute()
    return result.data


async def get_submissions_by_status(
    status: str = "pending", limit: int = 50, offset: int = 0
) -> list[dict]:
    """Get submissions filtered by status (admin use)."""
    query = supabase.table("mod_submissions").select("*")

    if status != "all":
        query = query.eq("status", status)

    query = query.order("created_at", desc=True).range(offset, offset + limit - 1)
    result = query.execute()
    return result.data


async def update_submission(submission_id: str, data: dict) -> Optional[dict]:
    """Update a submission. Returns updated row."""
    result = (
        supabase.table("mod_submissions")
        .update(data)
        .eq("id", submission_id)
        .execute()
    )
    return result.data[0] if result.data else None


async def delete_submission(submission_id: str) -> bool:
    """Delete a submission. Returns True if deleted."""
    result = (
        supabase.table("mod_submissions")
        .delete()
        .eq("id", submission_id)
        .execute()
    )
    return bool(result.data)


async def get_user_public_profile(user_id: str) -> Optional[dict]:
    """Get public profile data: display_name + submission stats."""
    profile_result = (
        supabase.table("user_profiles")
        .select("display_name, created_at")
        .eq("id", user_id)
        .execute()
    )
    if not profile_result.data:
        return None

    profile = profile_result.data[0]

    # Get approved submissions count and total downloads
    subs_result = (
        supabase.table("mod_submissions")
        .select("id, download_count")
        .eq("user_id", user_id)
        .eq("status", "approved")
        .execute()
    )
    subs = subs_result.data
    total_downloads = sum(s["download_count"] for s in subs)

    return {
        "user_id": user_id,
        "display_name": profile.get("display_name") or "Anonymous",
        "joined_at": profile.get("created_at"),
        "total_mods": len(subs),
        "total_downloads": total_downloads,
    }
