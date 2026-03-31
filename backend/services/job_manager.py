import logging
from typing import Optional

from utils.supabase_client import supabase

logger = logging.getLogger(__name__)


async def create_job(
    description: str,
    mod_name: Optional[str],
    author_name: str,
    edition: str = "java",
    model_used: str = "gpt-oss-120b",
    user_id: Optional[str] = None,
) -> str:
    data = {
        "description": description,
        "mod_name": mod_name,
        "author_name": author_name,
        "status": "queued",
        "progress_message": "Queued...",
        "model_used": model_used,
    }
    if user_id is not None:
        data["user_id"] = user_id
    # Only add edition/generated_files if columns exist
    try:
        data["edition"] = edition
        data["generated_files"] = {}
    except Exception:
        pass

    result = supabase.table("jobs").insert(data).execute()
    return result.data[0]["id"]


async def update_job(
    job_id: str,
    status: Optional[str] = None,
    progress_message: Optional[str] = None,
    mod_id: Optional[str] = None,
    mod_spec: Optional[dict] = None,
    jar_file_path: Optional[str] = None,
    jar_file_url: Optional[str] = None,
    error: Optional[str] = None,
    generated_files: Optional[dict] = None,
    texture_previews: Optional[dict] = None,
):
    data = {}
    if status is not None:
        data["status"] = status
    if progress_message is not None:
        data["progress_message"] = progress_message
    if mod_id is not None:
        data["mod_id"] = mod_id
    if mod_spec is not None:
        data["mod_spec"] = mod_spec
    if jar_file_path is not None:
        data["jar_file_path"] = jar_file_path
    if jar_file_url is not None:
        data["jar_file_url"] = jar_file_url
    if error is not None:
        data["error"] = error
    if generated_files is not None:
        data["generated_files"] = generated_files
    if texture_previews is not None:
        data["texture_previews"] = texture_previews

    if data:
        supabase.table("jobs").update(data).eq("id", job_id).execute()


async def get_job(job_id: str) -> Optional[dict]:
    result = supabase.table("jobs").select("*").eq("id", job_id).execute()
    if result.data:
        return result.data[0]
    return None
