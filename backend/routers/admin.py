"""Admin endpoints for submission approval."""
import logging
from fastapi import APIRouter, Depends, HTTPException, Query

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
