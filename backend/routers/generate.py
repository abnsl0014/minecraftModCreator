from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse, Response

from models import GenerateRequest, EditRequest, JobStatus, TexturePreviews
from services.job_manager import create_job, get_job
from services.agent_loop import run_agent_loop, run_edit_loop
from utils.auth import require_auth
from utils.rate_limiter import check_rate_limit
from routers.user import deduct_tokens
from services.bedrock_assembler import generate_entity_geometry

router = APIRouter(prefix="/api")


@router.post("/generate")
async def generate_mod(request: GenerateRequest, background_tasks: BackgroundTasks, user_id: str = Depends(check_rate_limit)):
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    if request.edition not in ("java", "bedrock"):
        raise HTTPException(status_code=400, detail="Edition must be 'java' or 'bedrock'")

    # Deduct tokens: 1 per generation (no server-side compilation)
    token_cost = 1
    await deduct_tokens(user_id, token_cost, "mod_generation")

    job_id = await create_job(
        description=request.description,
        mod_name=request.mod_name,
        author_name=request.author_name,
        edition=request.edition,
        model_used=request.model,
        user_id=user_id,
    )

    background_tasks.add_task(run_agent_loop, job_id, request)

    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    tex = job.get("texture_previews")
    texture_previews = TexturePreviews(**tex) if tex else None

    return JobStatus(
        job_id=job["id"],
        status=job["status"],
        progress_message=job["progress_message"] or "",
        download_ready=job["status"] == "complete",
        jar_url=job.get("jar_file_url"),
        error=job.get("error"),
        edition=job.get("edition", "java"),
        can_edit=job["status"] in ("complete", "failed") and bool(job.get("generated_files")),
        mod_id=job.get("mod_id"),
        model_used=job.get("model_used", "gpt-oss-120b"),
        texture_previews=texture_previews,
    )


@router.post("/edit/{job_id}")
async def edit_mod(job_id: str, request: EditRequest, background_tasks: BackgroundTasks, user_id: str = Depends(require_auth)):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.get("generated_files"):
        raise HTTPException(status_code=400, detail="No generated files to edit")

    if not request.edit_description.strip():
        raise HTTPException(status_code=400, detail="Edit description cannot be empty")

    background_tasks.add_task(run_edit_loop, job_id, request.edit_description)

    return {"job_id": job_id, "status": "editing"}


@router.get("/preview/{job_id}")
async def get_preview(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail="Mod is not ready for preview")

    mod_spec = job.get("mod_spec")
    if not mod_spec:
        raise HTTPException(status_code=404, detail="No mod spec found")

    items = [
        {
            "registry_name": item["registry_name"],
            "display_name": item["display_name"],
            "item_type": item.get("item_type", "basic"),
            "color": item.get("color", "#888888"),
        }
        for item in mod_spec.get("items", [])
    ]

    blocks = [
        {
            "registry_name": block["registry_name"],
            "display_name": block["display_name"],
            "color": block.get("color", "#888888"),
        }
        for block in mod_spec.get("blocks", [])
    ]

    mobs = [
        {
            "registry_name": mob["registry_name"],
            "display_name": mob["display_name"],
            "color": mob.get("color", "#888888"),
            "geometry": generate_entity_geometry(mob["registry_name"]),
        }
        for mob in mod_spec.get("mobs", [])
    ]

    return {
        "mod_name": mod_spec.get("mod_name", ""),
        "mod_id": mod_spec.get("mod_id", ""),
        "items": items,
        "blocks": blocks,
        "mobs": mobs,
    }


@router.get("/download/{job_id}")
async def download_mod(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "complete":
        raise HTTPException(status_code=400, detail="Mod is not ready for download")

    jar_url = job.get("jar_file_url")
    if not jar_url:
        raise HTTPException(status_code=404, detail="File not found")

    # Build a proper filename
    mod_id = job.get("mod_id") or "mod"
    edition = job.get("edition", "java")
    ext = ".mcaddon" if edition == "bedrock" else "-forge-project.zip"
    filename = "%s%s" % (mod_id, ext)

    # Redirect to Supabase URL with content-disposition header hint
    return RedirectResponse(
        url="%s?download=%s" % (jar_url, filename),
        headers={"Content-Disposition": "attachment; filename=\"%s\"" % filename},
    )


@router.get("/preview-texture")
async def preview_texture(
    item_type: str = Query("weapon"),
    sub_type: str = Query("sword"),
    material: str = Query("diamond"),
    style: str = Query("classic"),
):
    """Generate a texture preview PNG (128x128 scaled up from 16x16)."""
    from services.procedural_textures import generate_preview_base64
    try:
        data_url = generate_preview_base64(item_type, sub_type, material, style)
        return {"preview": data_url}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
