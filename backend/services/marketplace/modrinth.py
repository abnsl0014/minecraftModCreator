"""Modrinth marketplace provider."""

import asyncio
import json
import logging

import httpx

from .base import MarketplaceProvider, ModSearchResult, ModDetails, ModVersion

logger = logging.getLogger(__name__)

BASE_URL = "https://api.modrinth.com/v2"
HEADERS = {"User-Agent": "ModCrafter/1.0 (modcrafter.app)"}
TIMEOUT = 10.0


class ModrinthProvider(MarketplaceProvider):

    @property
    def name(self) -> str:
        return "modrinth"

    def is_available(self) -> bool:
        return True  # Modrinth API is open, no key required

    async def search(
        self,
        query: str,
        limit: int = 20,
        offset: int = 0,
        game_version: str = "",
        category: str = "",
    ) -> list[ModSearchResult]:
        params: dict = {
            "query": query,
            "limit": limit,
            "offset": offset,
            "index": "relevance",
        }

        facets = [["project_type:mod"]]
        if game_version:
            facets.append([f"versions:{game_version}"])
        if category:
            facets.append([f"categories:{category}"])
        params["facets"] = json.dumps(facets)

        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.get(f"{BASE_URL}/search", params=params, headers=HEADERS)
                resp.raise_for_status()
                data = resp.json()
        except Exception as e:
            logger.error("Modrinth search failed: %s", e)
            return []

        return [
            ModSearchResult(
                id=hit["project_id"],
                name=hit["title"],
                description=hit.get("description", ""),
                author=hit.get("author", "Unknown"),
                icon_url=hit.get("icon_url"),
                downloads=hit.get("downloads", 0),
                follows=hit.get("follows", 0),
                categories=hit.get("categories", []),
                game_versions=(hit.get("versions") or [])[-5:],
                source=self.name,
                url=f"https://modrinth.com/mod/{hit['slug']}",
                created_at=hit.get("date_created"),
                updated_at=hit.get("date_modified"),
            )
            for hit in data.get("hits", [])
        ]

    async def get_mod(self, mod_id: str) -> ModDetails:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            proj_task = client.get(f"{BASE_URL}/project/{mod_id}", headers=HEADERS)
            ver_task = client.get(f"{BASE_URL}/project/{mod_id}/version", headers=HEADERS)
            proj_resp, ver_resp = await asyncio.gather(proj_task, ver_task)

        if proj_resp.status_code != 200:
            raise LookupError(f"Mod '{mod_id}' not found on Modrinth")

        project = proj_resp.json()
        versions_raw = ver_resp.json() if ver_resp.status_code == 200 else []

        versions = []
        for v in versions_raw[:30]:
            primary = next((f for f in v.get("files", []) if f.get("primary")), None)
            if not primary and v.get("files"):
                primary = v["files"][0]
            if not primary:
                continue
            versions.append(ModVersion(
                id=v["id"],
                name=v.get("name", v["version_number"]),
                version_number=v["version_number"],
                game_versions=v.get("game_versions", []),
                loaders=v.get("loaders", []),
                download_url=primary["url"],
                filename=primary["filename"],
                size=primary.get("size", 0),
                date_published=v.get("date_published"),
            ))

        return ModDetails(
            id=project["id"],
            name=project["title"],
            description=project.get("description", ""),
            body=project.get("body", ""),
            author=project.get("team", "Unknown"),
            icon_url=project.get("icon_url"),
            downloads=project.get("downloads", 0),
            source=self.name,
            url=f"https://modrinth.com/mod/{project['slug']}",
            versions=versions,
        )

    async def get_download_url(self, mod_id: str, version_id: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                resp = await client.get(f"{BASE_URL}/version/{version_id}", headers=HEADERS)
                resp.raise_for_status()
                version = resp.json()
        except Exception:
            raise LookupError(f"Version '{version_id}' not found on Modrinth")

        primary = next((f for f in version.get("files", []) if f.get("primary")), None)
        if not primary and version.get("files"):
            primary = version["files"][0]
        if not primary:
            raise LookupError("No downloadable file for this version")

        return primary["url"]
