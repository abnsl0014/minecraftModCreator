"""Browse mods from Modrinth (and later CurseForge)."""
import logging
from urllib.parse import quote

import httpx
from fastapi import APIRouter, Query

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/browse")

MODRINTH_BASE = "https://api.modrinth.com/v2"
MODRINTH_HEADERS = {"User-Agent": "ModCrafter/1.0 (modcrafter.app)"}


@router.get("/search")
async def search_mods(
    q: str = Query("", description="Search query"),
    source: str = Query("modrinth", regex="^(modrinth|curseforge|all)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    game_version: str = Query("", description="Filter by Minecraft version"),
    category: str = Query("", description="Filter by category (e.g. weapons, tools)"),
):
    """Search for mods on external platforms."""
    results = []

    if source in ("modrinth", "all"):
        modrinth_results = await _search_modrinth(q, limit, offset, game_version, category)
        results.extend(modrinth_results)

    return {"mods": results, "total": len(results), "source": source}


async def _search_modrinth(
    query: str, limit: int, offset: int, game_version: str, category: str,
) -> list:
    """Search Modrinth API for mods."""
    params = {
        "query": query,
        "limit": limit,
        "offset": offset,
        "index": "relevance",
    }

    # Build facets filter
    facets = [['project_type:mod']]
    if game_version:
        facets.append([f'versions:{game_version}'])
    if category:
        facets.append([f'categories:{category}'])

    # Modrinth expects facets as JSON array
    import json
    params["facets"] = json.dumps(facets)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                f"{MODRINTH_BASE}/search",
                params=params,
                headers=MODRINTH_HEADERS,
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as e:
        logger.error(f"Modrinth search failed: {e}")
        return []

    mods = []
    for hit in data.get("hits", []):
        mods.append({
            "id": hit["project_id"],
            "name": hit["title"],
            "description": hit.get("description", ""),
            "author": hit.get("author", "Unknown"),
            "icon_url": hit.get("icon_url"),
            "downloads": hit.get("downloads", 0),
            "follows": hit.get("follows", 0),
            "categories": hit.get("categories", []),
            "game_versions": hit.get("versions", [])[-5:] if hit.get("versions") else [],
            "source": "modrinth",
            "url": f"https://modrinth.com/mod/{hit['slug']}",
            "created_at": hit.get("date_created"),
            "updated_at": hit.get("date_modified"),
        })

    return mods
