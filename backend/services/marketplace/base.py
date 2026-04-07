"""Abstract base for marketplace provider integrations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class ModSearchResult:
    id: str
    name: str
    description: str
    author: str
    icon_url: str | None
    downloads: int
    follows: int
    categories: list[str]
    game_versions: list[str]
    source: str
    url: str
    created_at: str | None = None
    updated_at: str | None = None


@dataclass
class ModVersion:
    id: str
    name: str
    version_number: str
    game_versions: list[str]
    loaders: list[str]
    download_url: str | None
    filename: str
    size: int
    date_published: str | None = None
    third_party_allowed: bool = True


@dataclass
class ModDetails:
    id: str
    name: str
    description: str
    body: str
    author: str
    icon_url: str | None
    downloads: int
    source: str
    url: str
    versions: list[ModVersion] = field(default_factory=list)


class MarketplaceProvider(ABC):
    """Interface that every marketplace integration must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Short identifier used in API routes and responses (e.g. 'modrinth')."""

    @abstractmethod
    def is_available(self) -> bool:
        """Return True if the provider is configured (API keys set, etc.)."""

    @abstractmethod
    async def search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        game_version: str = "",
        category: str = "",
    ) -> list[ModSearchResult]:
        """Search for mods matching the query."""

    @abstractmethod
    async def get_mod(self, mod_id: str) -> ModDetails:
        """Fetch full mod details including available versions/files."""

    @abstractmethod
    async def get_download_url(self, mod_id: str, version_id: str) -> str:
        """
        Resolve the CDN download URL for a specific version.
        Raises an exception if the download is not available (e.g. author disabled
        third-party downloads on CurseForge).
        """
