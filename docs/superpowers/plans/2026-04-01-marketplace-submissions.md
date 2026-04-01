# Marketplace & Mod Submissions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a community mod marketplace with user submissions, admin approval, download tracking, and earnings dashboard.

**Architecture:** Separate `mod_submissions` table from `jobs`. New backend routers (`submissions.py`, `admin.py`) follow existing pattern (routers → services → utils). Frontend replaces localStorage-based submit/admin with real API integration. Download tracking via `download_events` table with IP-based 24h dedup.

**Tech Stack:** FastAPI, Supabase (PostgreSQL + Storage), Next.js 16, React 19, Tailwind CSS 4, TypeScript

**Spec:** `docs/superpowers/specs/2026-04-01-marketplace-submissions-design.md`

---

## Task 1: Database Migration

**Files:**
- Create: `supabase/migration-004-marketplace.sql`
- Modify: `supabase/schema.sql` (append new tables)

- [ ] **Step 1: Create migration file**

```sql
-- supabase/migration-004-marketplace.sql
-- Marketplace: submissions, download tracking, admin support

-- 1. Mod submissions table
CREATE TABLE mod_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    job_id UUID REFERENCES jobs(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    edition TEXT NOT NULL CHECK (edition IN ('java', 'bedrock')),
    category TEXT NOT NULL CHECK (category IN ('weapon', 'tool', 'armor', 'food', 'block', 'ability')),
    tags TEXT[] DEFAULT '{}',
    screenshots TEXT[] DEFAULT '{}',
    video_url TEXT,
    download_url TEXT NOT NULL,
    crafting_recipe JSONB,
    survival_guide TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    download_count INT NOT NULL DEFAULT 0,
    featured BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_submissions_user_id ON mod_submissions(user_id);
CREATE INDEX idx_submissions_status ON mod_submissions(status);
CREATE INDEX idx_submissions_featured ON mod_submissions(featured) WHERE featured = true;

-- Auto-update updated_at (reuse existing function)
CREATE TRIGGER update_submissions_updated_at
    BEFORE UPDATE ON mod_submissions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE mod_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read approved submissions" ON mod_submissions
    FOR SELECT USING (status = 'approved' OR user_id = auth.uid());
CREATE POLICY "Authenticated insert submissions" ON mod_submissions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner update submissions" ON mod_submissions
    FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Owner delete submissions" ON mod_submissions
    FOR DELETE USING (user_id = auth.uid());

-- 2. Download events table
CREATE TABLE download_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id UUID NOT NULL REFERENCES mod_submissions(id) ON DELETE CASCADE,
    downloader_ip TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_download_events_submission ON download_events(submission_id);
CREATE INDEX idx_download_events_dedup ON download_events(submission_id, downloader_ip, created_at);

ALTER TABLE download_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only for download_events" ON download_events
    FOR ALL USING (true);

-- 3. Add columns to user_profiles
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS earnings_balance INT NOT NULL DEFAULT 0;

-- 4. Screenshots storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('mod-screenshots', 'mod-screenshots', true, 10485760)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read mod-screenshots" ON storage.objects
    FOR SELECT USING (bucket_id = 'mod-screenshots');

CREATE POLICY "Authenticated upload mod-screenshots" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'mod-screenshots' AND auth.uid() IS NOT NULL);
```

- [ ] **Step 2: Append schema reference to schema.sql**

Add a comment block at the end of `supabase/schema.sql` referencing the new migration:

```sql
-- 9. Marketplace tables (see migration-004-marketplace.sql)
-- mod_submissions, download_events, user_profiles additions
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migration-004-marketplace.sql supabase/schema.sql
git commit -m "feat: add marketplace database migration — submissions, downloads, admin"
```

---

## Task 2: Backend Config & Models

**Files:**
- Modify: `backend/config.py`
- Modify: `backend/models.py`

- [ ] **Step 1: Add earnings config to Settings**

In `backend/config.py`, add to the `Settings` class after `dodo_product_unlimited_monthly`:

```python
    earnings_per_download: int = 100  # paise (₹1 per download)
```

- [ ] **Step 2: Add submission Pydantic models**

Append to `backend/models.py`:

```python
class SubmissionCreate(BaseModel):
    title: str
    description: str
    edition: str = "bedrock"
    category: str = "weapon"
    tags: List[str] = []
    video_url: Optional[str] = None
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = None
    job_id: Optional[str] = None  # link to AI-generated mod


class SubmissionUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    edition: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    video_url: Optional[str] = None
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = None


class SubmissionResponse(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    title: str
    description: str
    edition: str
    category: str
    tags: List[str] = []
    screenshots: List[str] = []
    video_url: Optional[str] = None
    download_url: str
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    download_count: int = 0
    featured: bool = False
    created_at: str
    updated_at: str
    author_name: Optional[str] = None  # joined from user_profiles.display_name


class AdminRejectRequest(BaseModel):
    reason: str
```

- [ ] **Step 3: Commit**

```bash
git add backend/config.py backend/models.py
git commit -m "feat: add submission models and earnings config"
```

---

## Task 3: Admin Auth Dependency

**Files:**
- Create: `backend/utils/admin_auth.py`

- [ ] **Step 1: Create admin auth dependency**

```python
"""FastAPI dependency for admin-only routes."""
from fastapi import Depends, HTTPException

from utils.auth import require_auth
from utils.supabase_client import supabase


async def require_admin(user_id: str = Depends(require_auth)) -> str:
    """Require authenticated user with is_admin=true. Returns user_id."""
    result = (
        supabase.table("user_profiles")
        .select("is_admin")
        .eq("id", user_id)
        .execute()
    )

    if not result.data or not result.data[0].get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    return user_id
```

- [ ] **Step 2: Commit**

```bash
git add backend/utils/admin_auth.py
git commit -m "feat: add require_admin auth dependency"
```

---

## Task 4: Submission Manager Service

**Files:**
- Create: `backend/services/submission_manager.py`

- [ ] **Step 1: Create submission CRUD service**

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/submission_manager.py
git commit -m "feat: add submission_manager service — CRUD for mod_submissions"
```

---

## Task 5: Download Tracker Service

**Files:**
- Create: `backend/services/download_tracker.py`

- [ ] **Step 1: Create download tracking service**

```python
"""Download counting with IP-based 24h dedup and earnings tracking."""
import logging
from datetime import datetime, timedelta, timezone

from config import settings
from utils.supabase_client import supabase

logger = logging.getLogger(__name__)


async def track_download(submission_id: str, downloader_ip: str) -> dict:
    """
    Record a download event. Deduplicates by IP within 24 hours.
    Returns {download_url, counted} where counted=True if this was a new download.
    """
    # Get the submission
    sub_result = (
        supabase.table("mod_submissions")
        .select("id, download_url, download_count, user_id, status")
        .eq("id", submission_id)
        .execute()
    )
    if not sub_result.data:
        return {"error": "Submission not found"}

    submission = sub_result.data[0]

    if submission["status"] != "approved":
        return {"error": "Submission not available for download"}

    # Check for duplicate download within 24 hours
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    dup_result = (
        supabase.table("download_events")
        .select("id")
        .eq("submission_id", submission_id)
        .eq("downloader_ip", downloader_ip)
        .gte("created_at", cutoff)
        .limit(1)
        .execute()
    )

    counted = not bool(dup_result.data)

    if counted:
        # Insert download event
        supabase.table("download_events").insert({
            "submission_id": submission_id,
            "downloader_ip": downloader_ip,
        }).execute()

        # Increment download count
        new_count = submission["download_count"] + 1
        supabase.table("mod_submissions").update(
            {"download_count": new_count}
        ).eq("id", submission_id).execute()

        # Add earnings to author
        author_id = submission["user_id"]
        profile_result = (
            supabase.table("user_profiles")
            .select("earnings_balance")
            .eq("id", author_id)
            .execute()
        )
        if profile_result.data:
            new_balance = profile_result.data[0]["earnings_balance"] + settings.earnings_per_download
            supabase.table("user_profiles").update(
                {"earnings_balance": new_balance}
            ).eq("id", author_id).execute()

        logger.info(f"Download tracked: submission={submission_id}, ip={downloader_ip}")

    return {
        "download_url": submission["download_url"],
        "counted": counted,
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/download_tracker.py
git commit -m "feat: add download_tracker service — IP dedup, earnings calc"
```

---

## Task 6: Submissions Router

**Files:**
- Create: `backend/routers/submissions.py`

- [ ] **Step 1: Create submissions router**

```python
"""Submission CRUD + download endpoint."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form
from typing import Optional

from utils.auth import require_auth, get_current_user
from utils.supabase_client import supabase
from services.submission_manager import (
    create_submission,
    get_submission,
    get_user_submissions,
    update_submission,
    delete_submission,
    get_user_public_profile,
)
from services.download_tracker import track_download
from models import SubmissionCreate, SubmissionUpdate

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/submissions")


@router.post("")
async def submit_mod(
    title: str = Form(...),
    description: str = Form(...),
    edition: str = Form("bedrock"),
    category: str = Form("weapon"),
    tags: str = Form(""),  # comma-separated
    video_url: Optional[str] = Form(None),
    crafting_recipe: Optional[str] = Form(None),  # JSON string
    survival_guide: Optional[str] = Form(None),
    job_id: Optional[str] = Form(None),
    mod_file: UploadFile = File(...),
    screenshots: list[UploadFile] = File(default=[]),
    user_id: str = Depends(require_auth),
):
    """Create a new mod submission with file uploads."""
    import json
    import uuid

    # Validate category
    valid_categories = {"weapon", "tool", "armor", "food", "block", "ability"}
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category: {category}")

    # Validate edition
    if edition not in ("java", "bedrock"):
        raise HTTPException(status_code=400, detail=f"Invalid edition: {edition}")

    # Upload mod file to mod-jars bucket
    submission_id = str(uuid.uuid4())
    file_ext = mod_file.filename.split(".")[-1] if mod_file.filename else "zip"
    mod_file_path = f"submissions/{submission_id}/mod.{file_ext}"
    mod_file_content = await mod_file.read()

    supabase.storage.from_("mod-jars").upload(
        mod_file_path, mod_file_content,
        file_options={"content-type": mod_file.content_type or "application/octet-stream"},
    )
    mod_file_url = supabase.storage.from_("mod-jars").get_public_url(mod_file_path)

    # Upload screenshots to mod-screenshots bucket
    screenshot_urls = []
    for i, screenshot in enumerate(screenshots[:5]):  # max 5
        ss_content = await screenshot.read()
        ss_ext = screenshot.filename.split(".")[-1] if screenshot.filename else "png"
        ss_path = f"submissions/{submission_id}/screenshot_{i}.{ss_ext}"
        supabase.storage.from_("mod-screenshots").upload(
            ss_path, ss_content,
            file_options={"content-type": screenshot.content_type or "image/png"},
        )
        screenshot_urls.append(
            supabase.storage.from_("mod-screenshots").get_public_url(ss_path)
        )

    # Parse tags and crafting recipe
    tag_list = [t.strip() for t in tags.split(",") if t.strip()] if tags else []
    recipe_data = json.loads(crafting_recipe) if crafting_recipe else None

    result = await create_submission(
        user_id=user_id,
        title=title,
        description=description,
        edition=edition,
        category=category,
        download_url=mod_file_url,
        tags=tag_list,
        screenshots=screenshot_urls,
        video_url=video_url,
        crafting_recipe=recipe_data,
        survival_guide=survival_guide,
        job_id=job_id,
    )

    return {"id": result["id"], "status": "pending"}


@router.get("/my")
async def my_submissions(
    user_id: str = Depends(require_auth),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """List the authenticated user's submissions."""
    subs = await get_user_submissions(user_id, limit, offset)

    # Get user's earnings balance
    profile = supabase.table("user_profiles").select("earnings_balance").eq("id", user_id).execute()
    earnings = profile.data[0]["earnings_balance"] if profile.data else 0

    return {"submissions": subs, "total": len(subs), "earnings_balance": earnings}


@router.get("/{submission_id}")
async def get_single_submission(
    submission_id: str,
    user_id: Optional[str] = Depends(get_current_user),
):
    """Get a single submission. Approved = public. Pending/rejected = owner or admin only."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub["status"] != "approved":
        # Check if requester is owner or admin
        if not user_id or user_id != sub["user_id"]:
            # Check admin
            admin_check = (
                supabase.table("user_profiles")
                .select("is_admin")
                .eq("id", user_id or "")
                .execute()
            )
            is_admin = admin_check.data and admin_check.data[0].get("is_admin")
            if not is_admin:
                raise HTTPException(status_code=404, detail="Submission not found")

    # Attach author display name
    profile = (
        supabase.table("user_profiles")
        .select("display_name")
        .eq("id", sub["user_id"])
        .execute()
    )
    sub["author_name"] = (
        profile.data[0].get("display_name") if profile.data else None
    ) or "Anonymous"

    return sub


@router.put("/{submission_id}")
async def edit_submission(
    submission_id: str,
    updates: SubmissionUpdate,
    user_id: str = Depends(require_auth),
):
    """Edit a pending submission (owner only)."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your submission")
    if sub["status"] != "pending":
        raise HTTPException(status_code=400, detail="Can only edit pending submissions")

    data = updates.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await update_submission(submission_id, data)
    return result


@router.delete("/{submission_id}")
async def remove_submission(
    submission_id: str,
    user_id: str = Depends(require_auth),
):
    """Delete a submission (owner only)."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["user_id"] != user_id:
        raise HTTPException(status_code=403, detail="Not your submission")

    await delete_submission(submission_id)
    return {"status": "deleted"}


@router.post("/{submission_id}/download")
async def download_submission(
    submission_id: str,
    request: Request,
):
    """Track download and return download URL. IP-deduped within 24 hours."""
    # Get client IP (handles proxy headers)
    ip = request.headers.get("x-forwarded-for", request.client.host if request.client else "unknown")
    if "," in ip:
        ip = ip.split(",")[0].strip()

    result = await track_download(submission_id, ip)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/submissions.py
git commit -m "feat: add submissions router — CRUD, file upload, download tracking"
```

---

## Task 7: Admin Router

**Files:**
- Create: `backend/routers/admin.py`

- [ ] **Step 1: Create admin router**

```python
"""Admin endpoints for submission approval."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from utils.admin_auth import require_admin
from services.submission_manager import (
    get_submission,
    get_submissions_by_status,
    update_submission,
)
from models import AdminRejectRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin")


@router.get("/submissions")
async def list_submissions(
    status: str = Query("pending", regex="^(pending|approved|rejected|all)$"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    _admin_id: str = Depends(require_admin),
):
    """List submissions filtered by status."""
    subs = await get_submissions_by_status(status, limit, offset)
    return {"submissions": subs, "total": len(subs)}


@router.post("/submissions/{submission_id}/approve")
async def approve_submission(
    submission_id: str,
    featured: bool = False,
    _admin_id: str = Depends(require_admin),
):
    """Approve a submission. Optionally mark as featured."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] == "approved":
        raise HTTPException(status_code=400, detail="Already approved")

    result = await update_submission(submission_id, {
        "status": "approved",
        "featured": featured,
        "rejection_reason": None,
    })
    logger.info(f"Submission {submission_id} approved (featured={featured})")
    return result


@router.post("/submissions/{submission_id}/reject")
async def reject_submission(
    submission_id: str,
    body: AdminRejectRequest,
    _admin_id: str = Depends(require_admin),
):
    """Reject a submission with a reason."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")

    result = await update_submission(submission_id, {
        "status": "rejected",
        "rejection_reason": body.reason,
    })
    logger.info(f"Submission {submission_id} rejected: {body.reason}")
    return result


@router.post("/submissions/{submission_id}/feature")
async def toggle_featured(
    submission_id: str,
    _admin_id: str = Depends(require_admin),
):
    """Toggle featured status on an approved submission."""
    sub = await get_submission(submission_id)
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found")
    if sub["status"] != "approved":
        raise HTTPException(status_code=400, detail="Only approved submissions can be featured")

    new_featured = not sub["featured"]
    result = await update_submission(submission_id, {"featured": new_featured})
    logger.info(f"Submission {submission_id} featured={new_featured}")
    return result
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/admin.py
git commit -m "feat: add admin router — approve, reject, feature submissions"
```

---

## Task 8: Register Routers & Update Existing Endpoints

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/routers/gallery.py`
- Modify: `backend/routers/user.py`

- [ ] **Step 1: Register new routers in main.py**

Add imports after existing router imports (line 10 in `main.py`):

```python
from routers.submissions import router as submissions_router
from routers.admin import router as admin_router
```

Add after line 44 (`app.include_router(subscriptions_router)`):

```python
app.include_router(submissions_router)
app.include_router(admin_router)
```

- [ ] **Step 2: Update gallery router to merge submissions**

Replace the entire `get_gallery` function in `backend/routers/gallery.py`:

```python
from services.submission_manager import get_approved_submissions


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
            "author": sub.get("author_name", "Anonymous"),
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
```

- [ ] **Step 3: Update user profile endpoint**

In `backend/routers/user.py`, update the `get_profile` function to return new fields. Replace the return block after `profile = result.data[0]` (line 28-35):

```python
    profile = result.data[0]
    return {
        "token_balance": profile["token_balance"],
        "tier": profile["tier"],
        "created_at": profile["created_at"],
        "subscription_status": profile.get("subscription_status", "none"),
        "billing_period": profile.get("billing_period"),
        "is_admin": profile.get("is_admin", False),
        "display_name": profile.get("display_name"),
        "earnings_balance": profile.get("earnings_balance", 0),
    }
```

Also update the auto-create fallback return (line 21-26) to include the new fields:

```python
        return {
            "token_balance": 5,
            "tier": "free",
            "subscription_status": "none",
            "billing_period": None,
            "is_admin": False,
            "display_name": None,
            "earnings_balance": 0,
        }
```

- [ ] **Step 4: Add public profile endpoint**

Append to `backend/routers/user.py`:

```python
from services.submission_manager import get_user_public_profile, get_approved_submissions


@router.get("/{target_user_id}/public")
async def get_public_profile(target_user_id: str):
    """Get a user's public profile with their approved mods."""
    profile = await get_user_public_profile(target_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    # Get their approved submissions
    subs = (
        supabase.table("mod_submissions")
        .select("id, title, description, edition, category, download_count, featured, screenshots, created_at")
        .eq("user_id", target_user_id)
        .eq("status", "approved")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    profile["mods"] = subs.data
    return profile
```

- [ ] **Step 5: Commit**

```bash
git add backend/main.py backend/routers/gallery.py backend/routers/user.py
git commit -m "feat: register new routers, merge submissions into gallery, add public profiles"
```

---

## Task 9: Frontend API Functions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add submission types and API functions**

Append to `frontend/src/lib/api.ts`:

```typescript
// ---- Submission APIs ----

export interface Submission {
  id: string;
  user_id: string;
  job_id: string | null;
  title: string;
  description: string;
  edition: "java" | "bedrock";
  category: "weapon" | "tool" | "armor" | "food" | "block" | "ability";
  tags: string[];
  screenshots: string[];
  video_url: string | null;
  download_url: string;
  crafting_recipe: Record<string, unknown> | null;
  survival_guide: string | null;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  download_count: number;
  featured: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
}

export interface GalleryItem {
  id: string;
  name: string;
  description: string;
  edition: "java" | "bedrock";
  author: string;
  category: string;
  created_at: string;
  download_url: string;
  download_count: number;
  featured: boolean;
  screenshots: string[];
  tags: string[];
  source: "submission" | "ai_generated";
}

export interface GalleryListResponse {
  mods: GalleryItem[];
  total: number;
}

export async function getGalleryItems(
  sort: string = "recent",
  edition: string = "all",
  category: string = "all",
  limit: number = 20,
  offset: number = 0,
): Promise<GalleryListResponse> {
  const params = new URLSearchParams({ sort, edition, category, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/gallery?${params}`);
  if (!res.ok) throw new Error("Failed to fetch gallery");
  return res.json();
}

export async function submitMod(formData: FormData): Promise<{ id: string; status: string }> {
  const token = await getAuthToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  // Don't set Content-Type — browser sets multipart boundary automatically

  const res = await fetch(`${API_BASE}/api/submissions`, {
    method: "POST",
    headers,
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Submission failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Submission failed");
  }
  return res.json();
}

export async function getMySubmissions(
  limit: number = 20,
  offset: number = 0,
): Promise<{ submissions: Submission[]; total: number; earnings_balance: number }> {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/submissions/my?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch submissions");
  return res.json();
}

export async function getSubmission(id: string): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Submission not found");
  return res.json();
}

export async function updateSubmission(
  id: string,
  updates: Partial<Pick<Submission, "title" | "description" | "edition" | "category" | "tags" | "video_url" | "crafting_recipe" | "survival_guide">>,
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    method: "PUT",
    headers: await authHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update submission");
  return res.json();
}

export async function deleteSubmission(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/submissions/${id}`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete submission");
}

export async function trackDownload(
  submissionId: string,
): Promise<{ download_url: string; counted: boolean }> {
  const res = await fetch(`${API_BASE}/api/submissions/${submissionId}/download`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Download failed");
  return res.json();
}

// ---- Admin APIs ----

export async function getAdminSubmissions(
  status: string = "pending",
  limit: number = 50,
  offset: number = 0,
): Promise<{ submissions: Submission[]; total: number }> {
  const params = new URLSearchParams({ status, limit: String(limit), offset: String(offset) });
  const res = await fetch(`${API_BASE}/api/admin/submissions?${params}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch admin submissions");
  return res.json();
}

export async function approveSubmission(
  id: string,
  featured: boolean = false,
): Promise<Submission> {
  const params = new URLSearchParams({ featured: String(featured) });
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/approve?${params}`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to approve");
  return res.json();
}

export async function rejectSubmission(
  id: string,
  reason: string,
): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/reject`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to reject");
  return res.json();
}

export async function toggleFeatured(id: string): Promise<Submission> {
  const res = await fetch(`${API_BASE}/api/admin/submissions/${id}/feature`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to toggle featured");
  return res.json();
}

// ---- Public Profile API ----

export interface PublicProfile {
  user_id: string;
  display_name: string;
  joined_at: string;
  total_mods: number;
  total_downloads: number;
  mods: {
    id: string;
    title: string;
    description: string;
    edition: string;
    category: string;
    download_count: number;
    featured: boolean;
    screenshots: string[];
    created_at: string;
  }[];
}

export async function getPublicProfile(userId: string): Promise<PublicProfile> {
  const res = await fetch(`${API_BASE}/api/user/${userId}/public`);
  if (!res.ok) throw new Error("Profile not found");
  return res.json();
}
```

- [ ] **Step 2: Update UserProfile interface**

Update the existing `UserProfile` interface in `api.ts`:

```typescript
export interface UserProfile {
  token_balance: number;
  tier: string;
  created_at?: string;
  subscription_status?: string;
  billing_period?: string | null;
  is_admin?: boolean;
  display_name?: string | null;
  earnings_balance?: number;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add submission, admin, and profile API functions to frontend"
```

---

## Task 10: Submit Mod Page

**Files:**
- Create: `frontend/src/app/gallery/submit/page.tsx`

- [ ] **Step 1: Create the submit page**

```tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { submitMod } from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";
import { CATEGORY_CONFIG, MATERIAL_ICONS, CraftingSlot } from "@/lib/exploreData";

const CATEGORIES = Object.entries(CATEGORY_CONFIG) as [string, { label: string; color: string; icon: string }][];
const MATERIALS = Object.entries(MATERIAL_ICONS).filter(([k]) => k !== "empty");

export default function SubmitModPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenshotInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Basics
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("weapon");
  const [edition, setEdition] = useState<"java" | "bedrock">("bedrock");
  const [tags, setTags] = useState("");

  // Step 2: Media
  const [videoUrl, setVideoUrl] = useState("");
  const [survivalGuide, setSurvivalGuide] = useState("");
  const [recipe, setRecipe] = useState<(CraftingSlot | null)[]>(Array(9).fill(null));
  const [selectedMaterial, setSelectedMaterial] = useState("diamond");
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [screenshotPreviews, setScreenshotPreviews] = useState<string[]>([]);

  // Step 3: File
  const [modFile, setModFile] = useState<File | null>(null);

  function handleScreenshots(files: FileList | null) {
    if (!files) return;
    const newFiles = Array.from(files).slice(0, 5 - screenshots.length);
    const updated = [...screenshots, ...newFiles];
    setScreenshots(updated);

    // Generate previews
    const previews = [...screenshotPreviews];
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        previews.push(e.target?.result as string);
        setScreenshotPreviews([...previews]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeScreenshot(index: number) {
    setScreenshots((prev) => prev.filter((_, i) => i !== index));
    setScreenshotPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  function setRecipeSlot(index: number) {
    const newRecipe = [...recipe];
    if (newRecipe[index]?.item === selectedMaterial) {
      newRecipe[index] = null;
    } else {
      newRecipe[index] = { item: selectedMaterial, icon: MATERIAL_ICONS[selectedMaterial] };
    }
    setRecipe(newRecipe);
  }

  async function handleSubmit() {
    const authed = await isAuthenticated();
    if (!authed) {
      setError("Please sign in to submit a mod");
      return;
    }
    if (!modFile) {
      setError("Please upload a mod file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("edition", edition);
      formData.append("category", category);
      formData.append("tags", tags);
      if (videoUrl) formData.append("video_url", videoUrl);
      if (survivalGuide) formData.append("survival_guide", survivalGuide);

      const filledRecipe = recipe.filter(Boolean);
      if (filledRecipe.length > 0) {
        formData.append("crafting_recipe", JSON.stringify(recipe));
      }

      formData.append("mod_file", modFile);
      screenshots.forEach((file) => {
        formData.append("screenshots", file);
      });

      await submitMod(formData);
      router.push("/gallery/my-submissions?submitted=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  }

  const canProceedStep1 = title.trim() && description.trim();
  const canProceedStep3 = !!modFile;

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gallery" className="text-[#808080] hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Submit Your Mod
          </h1>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {["Basics", "Media & Recipe", "Upload & Review"].map((label, i) => (
            <div key={label} className="flex-1">
              <div className={`h-1 rounded ${i + 1 <= step ? "bg-[#d4a017]" : "bg-[#333]"}`} />
              <p className={`text-[7px] mt-1 ${i + 1 <= step ? "text-[#d4a017]" : "text-[#555]"}`}
                style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {error && (
          <div className="mc-panel p-3 mb-4 border-l-2 border-l-red-500">
            <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {error}
            </p>
          </div>
        )}

        {/* Step 1: Basics */}
        {step === 1 && (
          <div className="mc-panel p-4 space-y-4">
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Mod Name *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Dragon Slayer Sword Pack"
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none"
              />
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your mod, what it adds, how to use it..."
                rows={4}
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none"
                >
                  {CATEGORIES.map(([key, { label, icon }]) => (
                    <option key={key} value={key}>{icon} {label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                  Edition
                </label>
                <select
                  value={edition}
                  onChange={(e) => setEdition(e.target.value as "java" | "bedrock")}
                  className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none"
                >
                  <option value="bedrock">Bedrock</option>
                  <option value="java">Java</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. weapons, dragon, fantasy"
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none"
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!canProceedStep1}
              className="mc-btn w-full py-2 text-[10px] disabled:opacity-50"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              Next: Media & Recipe →
            </button>
          </div>
        )}

        {/* Step 2: Media & Recipe */}
        {step === 2 && (
          <div className="mc-panel p-4 space-y-4">
            {/* Screenshots */}
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Screenshots (up to 5)
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {screenshotPreviews.map((preview, i) => (
                  <div key={i} className="relative w-20 h-20 border border-[#333] rounded overflow-hidden">
                    <img src={preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeScreenshot(i)}
                      className="absolute top-0 right-0 bg-red-600 text-white w-4 h-4 text-[8px] flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {screenshots.length < 5 && (
                  <button
                    onClick={() => screenshotInputRef.current?.click()}
                    className="w-20 h-20 border border-dashed border-[#555] rounded flex items-center justify-center text-[#555] hover:border-[#d4a017] hover:text-[#d4a017]"
                  >
                    <span className="text-xl">+</span>
                  </button>
                )}
              </div>
              <input
                ref={screenshotInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleScreenshots(e.target.files)}
                className="hidden"
              />
            </div>

            {/* Video URL */}
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Video URL (YouTube)
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none"
              />
            </div>

            {/* Crafting Recipe */}
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Crafting Recipe
              </label>
              <div className="flex gap-4">
                <div className="grid grid-cols-3 gap-1">
                  {recipe.map((slot, i) => (
                    <button
                      key={i}
                      onClick={() => setRecipeSlot(i)}
                      className="w-10 h-10 bg-[#111] border border-[#333] flex items-center justify-center text-lg hover:border-[#d4a017]"
                    >
                      {slot?.icon || ""}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1 content-start">
                  {MATERIALS.map(([key, icon]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedMaterial(key)}
                      className={`w-8 h-8 text-sm border flex items-center justify-center ${
                        selectedMaterial === key ? "border-[#d4a017] bg-[#2a2000]" : "border-[#333] bg-[#111]"
                      }`}
                      title={key}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Survival Guide */}
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Survival Guide
              </label>
              <textarea
                value={survivalGuide}
                onChange={(e) => setSurvivalGuide(e.target.value)}
                placeholder="How to get/craft this mod's items in survival mode..."
                rows={3}
                className="w-full bg-[#111] border border-[#333] p-2 text-sm text-white rounded focus:border-[#d4a017] outline-none resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="mc-btn flex-1 py-2 text-[10px] bg-[#333]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="mc-btn flex-1 py-2 text-[10px]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                Next: Upload →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Upload & Review */}
        {step === 3 && (
          <div className="mc-panel p-4 space-y-4">
            {/* Mod file upload */}
            <div>
              <label className="block text-[8px] text-[#808080] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Mod File * (.zip, .jar, .mcaddon, .mcpack)
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#333] rounded p-6 text-center cursor-pointer hover:border-[#d4a017]"
              >
                {modFile ? (
                  <p className="text-[#d4a017] text-sm">{modFile.name} ({(modFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                ) : (
                  <p className="text-[#555] text-sm">Click to select mod file</p>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip,.jar,.mcaddon,.mcpack"
                onChange={(e) => setModFile(e.target.files?.[0] || null)}
                className="hidden"
              />
            </div>

            {/* Review summary */}
            <div className="space-y-2 text-sm">
              <h3 className="text-[10px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                Review
              </h3>
              <div className="grid grid-cols-2 gap-2 text-[#808080]">
                <span>Title:</span><span className="text-white">{title}</span>
                <span>Category:</span><span className="text-white">{CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG]?.label}</span>
                <span>Edition:</span><span className="text-white capitalize">{edition}</span>
                <span>Screenshots:</span><span className="text-white">{screenshots.length}</span>
                <span>Video:</span><span className="text-white">{videoUrl ? "Yes" : "No"}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(2)}
                className="mc-btn flex-1 py-2 text-[10px] bg-[#333]"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!canProceedStep3 || loading}
                className="mc-btn flex-1 py-2 text-[10px] disabled:opacity-50"
                style={{ fontFamily: "var(--font-pixel), monospace" }}
              >
                {loading ? "Submitting..." : "Submit for Review"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/gallery/submit/page.tsx
git commit -m "feat: add submit mod page — multi-step form with file uploads"
```

---

## Task 11: My Submissions Page

**Files:**
- Create: `frontend/src/app/gallery/my-submissions/page.tsx`

- [ ] **Step 1: Create my-submissions page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getMySubmissions, deleteSubmission, Submission } from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending Review", color: "#d4a017" },
  approved: { label: "Approved", color: "#55ff55" },
  rejected: { label: "Rejected", color: "#ff5555" },
};

export default function MySubmissionsPage() {
  const searchParams = useSearchParams();
  const justSubmitted = searchParams.get("submitted") === "true";

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earnings, setEarnings] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getMySubmissions();
        setSubmissions(data.submissions);
        setEarnings(data.earnings_balance);
      } catch {
        // Not logged in or error
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Delete this submission?")) return;
    try {
      await deleteSubmission(id);
      setSubmissions((prev) => prev.filter((s) => s.id !== id));
    } catch {
      alert("Failed to delete");
    }
  }

  const totalDownloads = submissions
    .filter((s) => s.status === "approved")
    .reduce((sum, s) => sum + s.download_count, 0);

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link href="/gallery" className="text-[#808080] hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </Link>
            <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              My Submissions
            </h1>
          </div>
          <Link href="/gallery/submit" className="mc-btn px-3 py-1 text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            + Submit New
          </Link>
        </div>

        {justSubmitted && (
          <div className="mc-panel p-3 mb-4 border-l-2 border-l-green-500">
            <p className="text-green-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Mod submitted! It will appear in the gallery once approved.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {submissions.length}
            </div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Total Mods
            </div>
          </div>
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              {totalDownloads}
            </div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Downloads
            </div>
          </div>
          <div className="mc-panel p-3 text-center">
            <div className="text-[16px] text-[#55ff55]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              ₹{(earnings / 100).toFixed(0)}
            </div>
            <div className="text-[7px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Earned
            </div>
          </div>
        </div>

        {/* Submissions list */}
        {loading ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Loading...
            </p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px] mb-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No submissions yet
            </p>
            <Link href="/gallery/submit" className="mc-btn px-4 py-2 text-[9px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Submit Your First Mod
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const statusStyle = STATUS_STYLES[sub.status] || STATUS_STYLES.pending;
              const catConfig = CATEGORY_CONFIG[sub.category as keyof typeof CATEGORY_CONFIG];
              return (
                <div key={sub.id} className="mc-panel p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-[11px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                          {sub.title}
                        </h3>
                        <span
                          className="text-[7px] px-2 py-0.5 rounded"
                          style={{
                            fontFamily: "var(--font-pixel), monospace",
                            color: statusStyle.color,
                            border: `1px solid ${statusStyle.color}`,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                        {sub.featured && (
                          <span className="text-[7px] px-2 py-0.5 rounded bg-[#d4a017] text-black"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="text-[#808080] text-xs mb-2">{sub.description.slice(0, 100)}...</p>
                      <div className="flex gap-3 text-[8px] text-[#555]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                        <span className="capitalize">{sub.edition}</span>
                        {sub.status === "approved" && <span>{sub.download_count} downloads</span>}
                      </div>
                      {sub.status === "rejected" && sub.rejection_reason && (
                        <div className="mt-2 p-2 bg-[#1a0000] border border-red-900 rounded text-xs text-red-400">
                          Reason: {sub.rejection_reason}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 ml-3">
                      {sub.status === "pending" && (
                        <button
                          onClick={() => handleDelete(sub.id)}
                          className="text-red-400 hover:text-red-300 text-[8px] px-2 py-1 border border-red-900 rounded"
                          style={{ fontFamily: "var(--font-pixel), monospace" }}
                        >
                          Delete
                        </button>
                      )}
                      {sub.status === "approved" && (
                        <Link
                          href={`/gallery/${sub.id}`}
                          className="text-[#d4a017] text-[8px] px-2 py-1 border border-[#d4a017] rounded"
                          style={{ fontFamily: "var(--font-pixel), monospace" }}
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/gallery/my-submissions/page.tsx
git commit -m "feat: add my-submissions page — status badges, earnings dashboard"
```

---

## Task 12: Mod Detail Page

**Files:**
- Create: `frontend/src/app/gallery/[id]/page.tsx`

- [ ] **Step 1: Create mod detail page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import CraftingGrid from "@/components/explore/CraftingGrid";
import { getSubmission, trackDownload, Submission } from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

function YouTubeEmbed({ url }: { url: string }) {
  // Extract video ID from various YouTube URL formats
  const match = url.match(/(?:youtu\.be\/|v=|\/embed\/)([a-zA-Z0-9_-]{11})/);
  if (!match) return null;
  return (
    <div className="aspect-video w-full rounded overflow-hidden border border-[#333]">
      <iframe
        src={`https://www.youtube.com/embed/${match[1]}`}
        className="w-full h-full"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

export default function ModDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const data = await getSubmission(id);
        setSubmission(data);
      } catch {
        // Not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDownload() {
    if (!submission) return;
    setDownloading(true);
    try {
      const result = await trackDownload(submission.id);
      // Update local count if it was counted
      if (result.counted) {
        setSubmission((prev) => prev ? { ...prev, download_count: prev.download_count + 1 } : prev);
      }
      // Trigger download
      window.open(result.download_url, "_blank");
    } catch {
      alert("Download failed");
    } finally {
      setDownloading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!submission) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Mod not found</p>
          <Link href="/gallery" className="mc-btn px-4 py-2 text-[9px] inline-block mt-4" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Back to Gallery
          </Link>
        </div>
      </main>
    );
  }

  const catConfig = CATEGORY_CONFIG[submission.category as keyof typeof CATEGORY_CONFIG];

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        {/* Back link */}
        <Link href="/gallery" className="inline-flex items-center gap-2 text-[#808080] hover:text-white mb-4 text-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Gallery
        </Link>

        {/* Header section */}
        <div className="mc-panel p-5 mb-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="text-[16px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                {submission.title}
              </h1>
              <div className="flex items-center gap-3 text-[8px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                <span className="text-[#808080]">
                  by{" "}
                  <Link href={`/profile/${submission.user_id}`} className="text-[#d4a017] hover:underline">
                    {submission.author_name || "Anonymous"}
                  </Link>
                </span>
                <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                <span className="text-[#808080] capitalize">{submission.edition}</span>
                {submission.featured && <span className="text-[#d4a017]">★ Featured</span>}
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="mc-btn px-4 py-2 text-[10px]"
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {downloading ? "..." : `Download (${submission.download_count})`}
            </button>
          </div>

          {/* Tags */}
          {submission.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {submission.tags.map((tag) => (
                <span key={tag} className="text-[7px] px-2 py-0.5 bg-[#1a1a1a] border border-[#333] rounded text-[#808080]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Screenshots */}
        {submission.screenshots.length > 0 && (
          <div className="mc-panel p-4 mb-4">
            <div className="aspect-video w-full rounded overflow-hidden border border-[#333] mb-2">
              <img
                src={submission.screenshots[currentImage]}
                alt={`Screenshot ${currentImage + 1}`}
                className="w-full h-full object-contain bg-black"
              />
            </div>
            {submission.screenshots.length > 1 && (
              <div className="flex gap-2 justify-center">
                {submission.screenshots.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`w-12 h-12 rounded overflow-hidden border-2 ${
                      i === currentImage ? "border-[#d4a017]" : "border-[#333]"
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Video */}
        {submission.video_url && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Video
            </h2>
            <YouTubeEmbed url={submission.video_url} />
          </div>
        )}

        {/* Description */}
        <div className="mc-panel p-4 mb-4">
          <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            Description
          </h2>
          <p className="text-[#c0c0c0] text-sm whitespace-pre-wrap">{submission.description}</p>
        </div>

        {/* Crafting Recipe */}
        {submission.crafting_recipe && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Crafting Recipe
            </h2>
            <CraftingGrid recipe={submission.crafting_recipe as (Record<string, string> | null)[]} />
          </div>
        )}

        {/* Survival Guide */}
        {submission.survival_guide && (
          <div className="mc-panel p-4 mb-4">
            <h2 className="text-[10px] text-[#d4a017] mb-2" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Survival Guide
            </h2>
            <p className="text-[#c0c0c0] text-sm whitespace-pre-wrap">{submission.survival_guide}</p>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/gallery/\\[id\\]/page.tsx
git commit -m "feat: add mod detail page — screenshots, video embed, download tracking"
```

---

## Task 13: Rewire Admin Page

**Files:**
- Modify: `frontend/src/app/gallery/admin/page.tsx`

- [ ] **Step 1: Replace admin page with real API integration**

Rewrite `frontend/src/app/gallery/admin/page.tsx` to use real API calls instead of localStorage. The full replacement:

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import {
  getAdminSubmissions,
  approveSubmission,
  rejectSubmission,
  toggleFeatured,
  Submission,
} from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

export default function AdminPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadSubmissions();
  }, [filter]);

  async function loadSubmissions() {
    setLoading(true);
    try {
      const data = await getAdminSubmissions(filter);
      setSubmissions(data.submissions);
    } catch {
      // Not admin or error
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(id: string, featured: boolean = false) {
    setActionLoading(id);
    try {
      await approveSubmission(id, featured);
      await loadSubmissions();
    } catch {
      alert("Failed to approve");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleReject(id: string) {
    if (!rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    setActionLoading(id);
    try {
      await rejectSubmission(id, rejectReason);
      setRejectReason("");
      setExpandedId(null);
      await loadSubmissions();
    } catch {
      alert("Failed to reject");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleFeatured(id: string) {
    try {
      await toggleFeatured(id);
      await loadSubmissions();
    } catch {
      alert("Failed to toggle featured");
    }
  }

  const counts = {
    pending: filter === "pending" ? submissions.length : "—",
    approved: filter === "approved" ? submissions.length : "—",
    rejected: filter === "rejected" ? submissions.length : "—",
  };

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/gallery" className="text-[#808080] hover:text-white">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-[14px] text-[#d4a017]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Mod Approvals
            </h1>
            <p className="text-[8px] text-[#555] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              Review and approve community submissions
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["pending", "approved", "rejected", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[8px] px-3 py-1 rounded border ${
                filter === f ? "border-[#d4a017] text-[#d4a017]" : "border-[#333] text-[#555]"
              }`}
              style={{ fontFamily: "var(--font-pixel), monospace" }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Submissions */}
        {loading ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No {filter === "all" ? "" : filter} submissions
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const catConfig = CATEGORY_CONFIG[sub.category as keyof typeof CATEGORY_CONFIG];
              const isExpanded = expandedId === sub.id;
              return (
                <div key={sub.id} className="mc-panel p-4">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : sub.id)}
                  >
                    <div className="flex-1">
                      <h3 className="text-[11px] text-white" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        {sub.title}
                      </h3>
                      <div className="flex gap-3 text-[8px] mt-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                        <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                        <span className="text-[#555] capitalize">{sub.edition}</span>
                        <span className="text-[#555]">{new Date(sub.created_at).toLocaleDateString()}</span>
                        <span className="text-[#555]">{sub.screenshots.length} screenshots</span>
                      </div>
                    </div>
                    <span className="text-[#555] text-xs">{isExpanded ? "▲" : "▼"}</span>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-[#333]">
                      <p className="text-[#c0c0c0] text-sm mb-3">{sub.description}</p>

                      {/* Screenshots preview */}
                      {sub.screenshots.length > 0 && (
                        <div className="flex gap-2 mb-3">
                          {sub.screenshots.map((url, i) => (
                            <img key={i} src={url} alt="" className="w-24 h-24 object-cover rounded border border-[#333]" />
                          ))}
                        </div>
                      )}

                      {sub.video_url && (
                        <p className="text-[8px] text-[#808080] mb-3">
                          Video: <a href={sub.video_url} target="_blank" className="text-[#d4a017] underline">{sub.video_url}</a>
                        </p>
                      )}

                      {/* Action buttons */}
                      {sub.status === "pending" && (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(sub.id); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-green-900 border-green-700"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleApprove(sub.id, true); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-[#2a2000] border-[#d4a017]"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}
                            >
                              Approve + Feature
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Rejection reason..."
                              className="flex-1 bg-[#111] border border-[#333] px-2 py-1 text-sm text-white rounded"
                            />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleReject(sub.id); }}
                              disabled={actionLoading === sub.id}
                              className="mc-btn px-3 py-1 text-[8px] bg-red-900 border-red-700"
                              style={{ fontFamily: "var(--font-pixel), monospace" }}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {sub.status === "approved" && (
                        <div className="flex gap-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleToggleFeatured(sub.id); }}
                            className="mc-btn px-3 py-1 text-[8px]"
                            style={{ fontFamily: "var(--font-pixel), monospace" }}
                          >
                            {sub.featured ? "Remove Featured" : "Mark Featured"}
                          </button>
                          <span className="text-[8px] text-[#555] self-center" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                            {sub.download_count} downloads
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/gallery/admin/page.tsx
git commit -m "feat: rewire admin page to real API — approve, reject, feature submissions"
```

---

## Task 14: Public Profile Page

**Files:**
- Create: `frontend/src/app/profile/[id]/page.tsx`

- [ ] **Step 1: Create public profile page**

```tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import { getPublicProfile, PublicProfile } from "@/lib/api";
import { CATEGORY_CONFIG } from "@/lib/exploreData";

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getPublicProfile(userId);
        setProfile(data);
      } catch {
        // Not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>Loading...</p>
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen px-4 py-8 pt-20">
        <Header />
        <div className="max-w-3xl mx-auto mc-panel p-8 text-center">
          <p className="text-red-400 text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>User not found</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 pt-20">
      <Header />
      <div className="max-w-3xl mx-auto">
        {/* Profile header */}
        <div className="mc-panel p-5 mb-6">
          <h1 className="text-[16px] text-[#d4a017] mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            {profile.display_name}
          </h1>
          <div className="flex gap-6 text-[9px] mt-3" style={{ fontFamily: "var(--font-pixel), monospace" }}>
            <div>
              <span className="text-[#d4a017] text-[14px]">{profile.total_mods}</span>
              <span className="text-[#555] ml-1">Mods</span>
            </div>
            <div>
              <span className="text-[#d4a017] text-[14px]">{profile.total_downloads}</span>
              <span className="text-[#555] ml-1">Downloads</span>
            </div>
            <div className="text-[#555]">
              Joined {new Date(profile.joined_at).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Mods grid */}
        {profile.mods.length === 0 ? (
          <div className="mc-panel p-8 text-center">
            <p className="text-[#555] text-[10px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
              No published mods yet
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.mods.map((mod) => {
              const catConfig = CATEGORY_CONFIG[mod.category as keyof typeof CATEGORY_CONFIG];
              return (
                <Link key={mod.id} href={`/gallery/${mod.id}`} className="mc-panel p-4 hover:border-[#d4a017] block">
                  {mod.screenshots[0] && (
                    <img src={mod.screenshots[0]} alt="" className="w-full h-32 object-cover rounded border border-[#333] mb-2" />
                  )}
                  <h3 className="text-[10px] text-white mb-1" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    {mod.title}
                  </h3>
                  <div className="flex gap-2 text-[7px]" style={{ fontFamily: "var(--font-pixel), monospace" }}>
                    <span style={{ color: catConfig?.color }}>{catConfig?.icon} {catConfig?.label}</span>
                    <span className="text-[#555]">{mod.download_count} downloads</span>
                    {mod.featured && <span className="text-[#d4a017]">★</span>}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/profile/\\[id\\]/page.tsx
git commit -m "feat: add public user profile page — mods grid, download stats"
```

---

## Task 15: Update Gallery Page & Header

**Files:**
- Modify: `frontend/src/app/gallery/page.tsx`
- Modify: `frontend/src/components/Header.tsx`

- [ ] **Step 1: Update gallery page to use new API**

Key changes to `frontend/src/app/gallery/page.tsx`:
- Import `getGalleryItems` and `GalleryItem` from `api.ts`
- Replace `getGalleryMods` calls with `getGalleryItems`
- Add category filter parameter
- Update `toExploreMod` to handle the new `GalleryItem` shape (which includes `source`, `download_count`, `featured`, `screenshots`)
- Add "Submit Your Mod" button linking to `/gallery/submit`
- Add "My Submissions" link for logged-in users

The `toExploreMod` function should be updated to:

```typescript
function toExploreMod(g: GalleryItem): ExploreMod {
  return {
    id: g.id,
    name: g.name,
    description: g.description,
    author: g.author,
    edition: g.edition as "java" | "bedrock",
    category: (g.category || "tool") as ExploreMod["category"],
    thumbnail: g.screenshots[0] || null,
    videoUrl: null,
    screenshots: g.screenshots,
    craftingRecipe: Array(9).fill(null),
    survivalGuide: "",
    downloads: g.download_count,
    likes: 0,
    status: "approved",
    featured: g.featured,
    createdAt: g.created_at,
    tags: g.tags,
    download_url: g.download_url,
  };
}
```

Replace the fetch call inside the `useEffect`:

```typescript
const data = await getGalleryItems(sort, editionParam, category);
```

Add a link to "My Submissions" and "Submit" in the page header area (next to the existing "Submit Mod" button).

- [ ] **Step 2: Add submission links to Header**

In `frontend/src/components/Header.tsx`, add navigation links for logged-in users:
- "My Submissions" → `/gallery/my-submissions`
- If `is_admin`, add "Admin" → `/gallery/admin`

This requires fetching the user profile to check `is_admin`. Add the admin link conditionally based on the profile data the header already fetches.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/gallery/page.tsx frontend/src/components/Header.tsx
git commit -m "feat: update gallery to show submissions, add submission links to header"
```

---

## Task 16: Final Integration & Cleanup

**Files:**
- Modify: `frontend/src/lib/exploreData.ts` (remove mock submissions)
- Verify: all new routes registered, imports correct

- [ ] **Step 1: Clean up mock data**

In `frontend/src/lib/exploreData.ts`:
- Remove `MOCK_PENDING_SUBMISSIONS` array
- Remove `getLocalSubmissions()` function
- Remove `updateSubmissionStatus()` function
- Remove `saveSubmission()` function
- Remove `generateId()` function
- Keep: `ExploreMod`, `ModSubmission`, `CraftingSlot` interfaces, `CATEGORY_CONFIG`, `MATERIAL_ICONS` (still used by components)

- [ ] **Step 2: Verify backend server starts**

Run: `cd backend && python -c "from main import app; print('OK')"`
Expected: `OK` (no import errors)

- [ ] **Step 3: Verify frontend builds**

Run: `cd frontend && npm run build`
Expected: Build succeeds with no TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/exploreData.ts
git commit -m "chore: remove mock submission data, clean up exploreData.ts"
```

- [ ] **Step 5: Final commit — version bump**

Update version in `frontend/package.json` from `0.3.0` to `0.4.0`.

```bash
git add frontend/package.json
git commit -m "chore: bump version to v0.4.0 — marketplace submissions"
```
