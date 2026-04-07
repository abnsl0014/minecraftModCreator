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

        # Atomic increment via RPC (prevents race conditions)
        try:
            supabase.rpc("atomic_increment_download", {
                "p_submission_id": submission_id,
                "p_earnings_per_download": settings.earnings_per_download,
            }).execute()
        except Exception as e:
            # Fallback to non-atomic if RPC not yet deployed
            logger.warning(f"atomic_increment_download RPC failed, using fallback: {e}")
            new_count = submission["download_count"] + 1
            supabase.table("mod_submissions").update(
                {"download_count": new_count}
            ).eq("id", submission_id).execute()

        logger.info(f"Download tracked: submission={submission_id}")

    return {
        "download_url": submission["download_url"],
        "counted": counted,
    }
