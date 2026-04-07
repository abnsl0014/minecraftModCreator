"""CurseForge marketplace provider."""

import asyncio
import logging
import os

import httpx

from .base import MarketplaceProvider, ModSearchResult, ModDetails, ModVersion

logger = logging.getLogger(__name__)

BASE_URL = "https://api.curseforge.com/v1"
GAME_ID = 432       # Minecraft
MOD_CLASS_ID = 6    # Mods
TIMEOUT = 10.0


class CurseForgeProvider(MarketplaceProvider):

    @property
    def name(self) -> str:
        return "curseforge"

    def _api_key(self) -> str:
        return os.environ.get("CURSEFORGE_API_KEY", "")

    def _headers(self) -> dict:
        return {
            "x-api-key": self._api_key(),
            "Accept": "application/json",
        }

    def is_available(self) -> bool:
        return bool(self._api_key())

    async def search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        game_version: str = "",
        category: str = "",
    ) -> list[ModSearchResult]:
        if not self.is_available():
            logger.warning("CURSEFORGE_API_KEY not set — skipping CurseForge search")
            return []

        params: dict = {
            "gameId": GAME_ID,
            "classId": MOD_CLASS_ID,
            "searchFilter": query,
            "pageSize": limit,
            "index": offset,
            "sortField": 2,   # popularity
            "sortOrder": "desc",
        }
        if game_version:
            params["gameVersion"] = game_version
        if category:
            params["categorySlug"] = category

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.get(
                    f"{BASE_URL}/mods/search", params=params, headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("CurseForge search failed: %s", e)
            return []

        results = []
        for mod in data.get("data", []):
            logo = mod.get("logo") or {}
            authors = mod.get("authors") or []
            versions = sorted({
                f.get("gameVersion", "")
                for f in (mod.get("latestFilesIndexes") or [])
                if f.get("gameVersion")
            })
            results.append(ModSearchResult(
                id=str(mod["id"]),
                name=mod.get("name", ""),
                description=mod.get("summary", ""),
                author=authors[0]["name"] if authors else "Unknown",
                icon_url=logo.get("thumbnailUrl"),
                downloads=int(mod.get("downloadCount", 0)),
                follows=mod.get("thumbsUpCount", 0),
                categories=[c["name"] for c in (mod.get("categories") or [])[:5]],
                game_versions=versions[-5:],
                source=self.name,
                url=mod.get("links", {}).get(
                    "websiteUrl",
                    f"https://www.curseforge.com/minecraft/mc-mods/{mod.get('slug', '')}",
                ),
                created_at=mod.get("dateCreated"),
                updated_at=mod.get("dateModified"),
            ))
        return results

    async def get_mod(self, mod_id: str) -> ModDetails:
        if not self.is_available():
            raise RuntimeError("CurseForge API key not configured")

        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            mod_task = client.get(f"{BASE_URL}/mods/{mod_id}", headers=self._headers())
            files_task = client.get(
                f"{BASE_URL}/mods/{mod_id}/files",
                params={"pageSize": 30},
                headers=self._headers(),
            )
            mod_resp, files_resp = await asyncio.gather(mod_task, files_task)

        if mod_resp.status_code != 200:
            raise LookupError(f"Mod '{mod_id}' not found on CurseForge")

        mod = mod_resp.json().get("data", {})
        files_raw = files_resp.json().get("data", []) if files_resp.status_code == 200 else []

        authors = mod.get("authors") or []
        logo = mod.get("logo") or {}

        versions = []
        for f in files_raw:
            dl_url = f.get("downloadUrl")
            versions.append(ModVersion(
                id=str(f["id"]),
                name=f.get("displayName", f.get("fileName", "")),
                version_number=f.get("displayName", ""),
                game_versions=f.get("gameVersions", []),
                loaders=[],
                download_url=dl_url,
                filename=f.get("fileName", ""),
                size=f.get("fileLength", 0),
                date_published=f.get("fileDate"),
                third_party_allowed=dl_url is not None,
            ))

        return ModDetails(
            id=str(mod["id"]),
            name=mod.get("name", ""),
            description=mod.get("summary", ""),
            body="",
            author=authors[0]["name"] if authors else "Unknown",
            icon_url=logo.get("thumbnailUrl"),
            downloads=int(mod.get("downloadCount", 0)),
            source=self.name,
            url=mod.get("links", {}).get("websiteUrl", ""),
            versions=versions,
        )

    async def get_download_url(self, mod_id: str, version_id: str) -> str:
        if not self.is_available():
            raise RuntimeError("CurseForge API key not configured")

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.get(
                    f"{BASE_URL}/mods/{mod_id}/files/{version_id}/download-url",
                    headers=self._headers(),
                )
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            raise LookupError(f"File '{version_id}' not found on CurseForge")

        download_url = data.get("data")
        if not download_url:
            raise PermissionError(
                "This mod's author has disabled third-party downloads. "
                "Please download directly from CurseForge."
            )
        return download_url
