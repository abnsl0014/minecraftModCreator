from fastapi import APIRouter, Depends, Query

from utils.auth import require_auth
from utils.supabase_client import supabase
from services.submission_manager import get_approved_submissions

router = APIRouter(prefix="/api")


@router.get("/gallery")
async def get_gallery(
    sort: str = Query("recent", regex="^(recent|popular|downloads|featured)$"),
    edition: str = Query("all", regex="^(all|java|bedrock)$"),
    category: str = Query("all", regex="^(all|weapon|tool|armor|food|block|ability)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """Return approved submissions + completed AI jobs for the gallery."""
    # Get approved community submissions
    submissions = await get_approved_submissions(sort, edition, category, limit, offset)

    mods = []
    for sub in submissions:
        mods.append({
            "id": sub["id"],
            "name": sub["title"],
            "description": (sub["description"] or "")[:200],
            "edition": sub["edition"],
            "author": "Anonymous",
            "category": sub["category"],
            "created_at": sub["created_at"],
            "download_url": sub["download_url"],
            "download_count": sub["download_count"],
            "featured": sub["featured"],
            "screenshots": sub.get("screenshots", []),
            "tags": sub.get("tags", []),
            "source": "submission",
        })

    # Also include completed AI-generated jobs (that aren't linked to a submission)
    job_query = supabase.table("jobs").select(
        "id, mod_name, description, edition, created_at, jar_file_url, mod_spec, author_name, model_used"
    ).eq("status", "complete").not_.is_("jar_file_url", "null")

    if edition != "all":
        job_query = job_query.eq("edition", edition)

    job_query = job_query.order("created_at", desc=True).range(offset, offset + limit - 1)
    job_result = job_query.execute()

    for job in job_result.data:
        spec = job.get("mod_spec") or {}
        items = spec.get("items", [])
        mods.append({
            "id": job["id"],
            "name": job.get("mod_name") or spec.get("mod_name", "Unnamed Mod"),
            "description": (job.get("description") or "")[:200],
            "edition": job.get("edition", "java"),
            "author": job.get("author_name", "Anonymous"),
            "category": "weapon" if any(i.get("item_type") == "weapon" for i in items) else "tool",
            "created_at": job.get("created_at"),
            "download_url": job.get("jar_file_url"),
            "download_count": 0,
            "featured": False,
            "screenshots": [],
            "tags": [job.get("edition", "java"), job.get("model_used", "")],
            "source": "ai_generated",
        })

    # Sort merged list
    if sort == "downloads":
        mods.sort(key=lambda m: m["download_count"], reverse=True)
    elif sort == "featured":
        mods.sort(key=lambda m: (m["featured"], m["created_at"]), reverse=True)
    else:
        mods.sort(key=lambda m: m["created_at"], reverse=True)

    return {"mods": mods[:limit], "total": len(mods)}


@router.get("/gallery/my-mods")
async def get_my_mods(
    user_id: str = Depends(require_auth),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """Return mods created by the authenticated user."""
    query = (
        supabase.table("jobs")
        .select("id, mod_name, description, edition, created_at, jar_file_url, mod_spec, author_name, model_used, status")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    result = query.execute()

    mods = []
    for job in result.data:
        spec = job.get("mod_spec") or {}
        items = spec.get("items", [])
        mods.append({
            "id": job["id"],
            "name": job.get("mod_name") or spec.get("mod_name", "Unnamed Mod"),
            "description": (job.get("description") or "")[:200],
            "edition": job.get("edition", "java"),
            "author": job.get("author_name", "Anonymous"),
            "created_at": job.get("created_at"),
            "download_url": job.get("jar_file_url"),
            "status": job.get("status", "unknown"),
            "model_used": job.get("model_used", "gpt-oss-120b"),
            "weapons_count": len([i for i in items if i.get("item_type") == "weapon"]),
            "tools_count": len([i for i in items if i.get("item_type") == "tool"]),
            "armor_count": len([i for i in items if i.get("item_type") == "armor"]),
            "food_count": len([i for i in items if i.get("item_type") == "food"]),
            "blocks_count": len(spec.get("blocks", [])),
        })

    return {"mods": mods, "total": len(mods)}
