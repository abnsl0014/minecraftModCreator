"""Marketplace provider registry — plug-and-play mod platform integrations."""

from .base import MarketplaceProvider, ModSearchResult, ModDetails, ModVersion
from .modrinth import ModrinthProvider
from .curseforge import CurseForgeProvider

# ── Registry ──────────────────────────────────────────────────────────────────
# Add new providers here. The key is the source name used in API queries.
PROVIDERS: dict[str, MarketplaceProvider] = {
    "modrinth": ModrinthProvider(),
    "curseforge": CurseForgeProvider(),
}


def get_provider(source: str) -> MarketplaceProvider:
    provider = PROVIDERS.get(source)
    if not provider:
        raise ValueError(f"Unknown marketplace source: {source}. Available: {list(PROVIDERS.keys())}")
    return provider


def get_available_sources() -> list[str]:
    """Return sources that are currently configured and usable."""
    return [name for name, p in PROVIDERS.items() if p.is_available()]


__all__ = [
    "MarketplaceProvider",
    "ModSearchResult",
    "ModDetails",
    "ModVersion",
    "PROVIDERS",
    "get_provider",
    "get_available_sources",
]
