from fastapi import APIRouter, Query

from utils.supabase_client import supabase

router = APIRouter(prefix="/api")


@router.get("/gallery")
async def get_gallery(
    sort: str = Query("recent", regex="^(recent|popular)$"),
    edition: str = Query("all", regex="^(all|java|bedrock)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """Return completed mods for the gallery."""
    query = supabase.table("jobs").select(
        "id, mod_name, description, edition, created_at, jar_file_url, mod_spec, author_name"
    ).eq("status", "complete").not_.is_("jar_file_url", "null")

    if edition != "all":
        query = query.eq("edition", edition)

    if sort == "recent":
        query = query.order("created_at", desc=True)
    else:
        query = query.order("created_at", desc=True)

    query = query.range(offset, offset + limit - 1)
    result = query.execute()

    mods = []
    for job in result.data:
        spec = job.get("mod_spec") or {}
        items = spec.get("items", [])
        blocks_count = len(spec.get("blocks", []))
        weapons_count = len([i for i in items if i.get("item_type") == "weapon"])
        tools_count = len([i for i in items if i.get("item_type") == "tool"])
        armor_count = len([i for i in items if i.get("item_type") == "armor"])
        food_count = len([i for i in items if i.get("item_type") == "food"])

        mods.append({
            "id": job["id"],
            "name": job.get("mod_name") or spec.get("mod_name", "Unnamed Mod"),
            "description": (job.get("description") or "")[:200],
            "edition": job.get("edition", "java"),
            "author": job.get("author_name", "Anonymous"),
            "created_at": job.get("created_at"),
            "download_url": job.get("jar_file_url"),
            "weapons_count": weapons_count,
            "tools_count": tools_count,
            "armor_count": armor_count,
            "food_count": food_count,
            "blocks_count": blocks_count,
        })

    return {"mods": mods, "total": len(mods)}
