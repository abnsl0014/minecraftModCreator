"""Submission CRUD + download endpoint."""
import json
import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, File, Form

from utils.auth import require_auth, get_current_user
from utils.supabase_client import supabase
from services.submission_manager import (
    create_submission,
    get_submission,
    get_user_submissions,
    update_submission,
    delete_submission,
)
from services.download_tracker import track_download
from models import SubmissionUpdate

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
