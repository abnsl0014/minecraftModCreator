"""Browse and download mods — thin router delegating to marketplace providers."""

import logging
from dataclasses import asdict

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import RedirectResponse

from services.marketplace import get_provider, get_available_sources, PROVIDERS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/browse")


@router.get("/sources")
async def list_sources():
    """Return which marketplace sources are currently available."""
    return {
        "sources": get_available_sources(),
        "all": list(PROVIDERS.keys()),
    }


@router.get("/search")
async def search_mods(
    q: str = Query("", description="Search query"),
    source: str = Query("modrinth", regex="^(modrinth|curseforge|all)$"),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    game_version: str = Query("", description="Filter by Minecraft version"),
    category: str = Query("", description="Filter by category"),
):
    """Search for mods on external platforms."""
    results = []

    sources = list(PROVIDERS.keys()) if source == "all" else [source]
    for src in sources:
        try:
            provider = get_provider(src)
            hits = await provider.search(q, limit, offset, game_version, category)
            results.extend(asdict(h) for h in hits)
        except ValueError:
            pass  # unknown source, skip

    return {"mods": results, "total": len(results), "source": source}


@router.get("/mod/{source}/{mod_id}")
async def get_mod_details(source: str, mod_id: str):
    """Fetch mod details and available file versions from a marketplace."""
    try:
        provider = get_provider(source)
    except ValueError:
        raise HTTPException(400, f"Unknown source: {source}")

    if not provider.is_available():
        raise HTTPException(503, f"{source} is not configured (missing API key?)")

    try:
        mod = await provider.get_mod(mod_id)
    except LookupError as e:
        raise HTTPException(404, str(e))

    return asdict(mod)


@router.get("/mod/{source}/{mod_id}/download")
async def download_mod(
    source: str,
    mod_id: str,
    version_id: str = Query(..., description="Version/file ID to download"),
):
    """Redirect to the mod file download URL on the source CDN."""
    try:
        provider = get_provider(source)
    except ValueError:
        raise HTTPException(400, f"Unknown source: {source}")

    if not provider.is_available():
        raise HTTPException(503, f"{source} is not configured")

    try:
        url = await provider.get_download_url(mod_id, version_id)
    except LookupError as e:
        raise HTTPException(404, str(e))
    except PermissionError as e:
        raise HTTPException(403, str(e))

    return RedirectResponse(url=url, status_code=302)
