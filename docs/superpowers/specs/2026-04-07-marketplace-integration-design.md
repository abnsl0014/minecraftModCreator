# Marketplace Integration — Multi-Platform Mod Browser & Download

**Date:** 2026-04-07
**Status:** Implemented

## Summary

Add the ability for users to browse and download Minecraft mods from external marketplaces (Modrinth, CurseForge) directly within ModCrafter, using a provider-based architecture for scalable integration.

## Architecture

### Provider Pattern

Each marketplace is implemented as a **provider** — a Python class that implements `MarketplaceProvider` (ABC). Providers are registered in a central dictionary and the router delegates all work to them.

```
backend/services/marketplace/
├── __init__.py          # Registry: PROVIDERS dict, get_provider(), get_available_sources()
├── base.py              # MarketplaceProvider ABC + dataclasses (ModSearchResult, ModDetails, ModVersion)
├── modrinth.py          # Modrinth provider (no API key required)
└── curseforge.py        # CurseForge provider (requires CURSEFORGE_API_KEY env var)
```

### Adding a New Provider

1. Create `backend/services/marketplace/<platform>.py` implementing `MarketplaceProvider`
2. Add one line to `__init__.py`: `"platform": PlatformProvider()`
3. Done — the router, API client, and frontend all handle it automatically via the `source` field

### Provider Interface

```python
class MarketplaceProvider(ABC):
    name: str                                          # e.g. "modrinth"
    is_available() -> bool                             # Config check (API key set?)
    search(query, limit, offset, ...) -> list[ModSearchResult]
    get_mod(mod_id) -> ModDetails                      # Details + version list
    get_download_url(mod_id, version_id) -> str        # Resolve CDN URL
```

### Error Contract

Providers raise standard Python exceptions that the router maps to HTTP codes:
- `LookupError` → 404 (mod/version not found)
- `PermissionError` → 403 (3rd-party download disabled by author)
- `RuntimeError` → 503 (provider not configured)

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/browse/sources` | List available/configured marketplace sources |
| GET | `/api/browse/search` | Search mods (supports `source=modrinth\|curseforge\|all`) |
| GET | `/api/browse/mod/{source}/{mod_id}` | Mod details + available versions |
| GET | `/api/browse/mod/{source}/{mod_id}/download?version_id=` | 302 redirect to CDN |

## Download Strategy

**Option A — Redirect (chosen):** Backend resolves the download URL from the marketplace API, then returns a `302 redirect` to the CDN. Benefits:
- Zero bandwidth cost on our server
- Modrinth/CurseForge download counts stay accurate (good for mod authors)
- No file size limits to worry about

For CurseForge mods where the author has disabled third-party downloads (`downloadUrl` is `null`), the frontend falls back to opening the mod page on CurseForge directly.

## Frontend Changes

- **Source tabs** (All / Modrinth / CurseForge) on the marketplace page
- **Version selector** in the mod detail modal — dropdown of available versions with game version + loader info
- **Download button** that triggers the redirect endpoint (or "Open on CurseForge" fallback)
- **Source badges** with platform-specific colors (green for Modrinth, orange for CurseForge)

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `CURSEFORGE_API_KEY` | For CurseForge | Free API key from console.curseforge.com |

Modrinth requires no API key. If `CURSEFORGE_API_KEY` is not set, CurseForge is silently skipped in search results and returns 503 on direct access.

## Platforms Evaluated

| Platform | Integrated | Notes |
|----------|-----------|-------|
| Modrinth | Yes | Open API, no key needed |
| CurseForge | Yes | Requires free API key, some authors disable 3rd-party downloads |
| Hangar (PaperMC) | No | Server plugins only, not client mods |
| Technic/FTB | No | Modpacks, not individual mods |
| Planet Minecraft | No | No public API |
