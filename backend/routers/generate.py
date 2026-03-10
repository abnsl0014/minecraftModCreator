from fastapi import APIRouter, BackgroundTasks, HTTPException

from models import GenerateRequest, EditRequest, JobStatus
from services.job_manager import create_job, get_job
from services.agent_loop import run_agent_loop, run_edit_loop

router = APIRouter(prefix="/api")


@router.post("/generate")
async def generate_mod(request: GenerateRequest, background_tasks: BackgroundTasks):
    if not request.description.strip():
        raise HTTPException(status_code=400, detail="Description cannot be empty")

    if request.edition not in ("java", "bedrock"):
        raise HTTPException(status_code=400, detail="Edition must be 'java' or 'bedrock'")

    job_id = await create_job(
        description=request.description,
        mod_name=request.mod_name,
        author_name=request.author_name,
        edition=request.edition,
    )

    background_tasks.add_task(run_agent_loop, job_id, request)

    return {"job_id": job_id}


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatus(
        job_id=job["id"],
        status=job["status"],
        progress_message=job["progress_message"] or "",
        iteration=job["iteration"] or 0,
        max_iterations=job["max_iterations"] or 3,
        download_ready=job["status"] == "complete",
        jar_url=job.get("jar_file_url"),
        error=job.get("error"),
        edition=job.get("edition", "java"),
        can_edit=job["status"] in ("complete", "failed") and bool(job.get("generated_files")),
    )


@router.post("/edit/{job_id}")
async def edit_mod(job_id: str, request: EditRequest, background_tasks: BackgroundTasks):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if not job.get("generated_files"):
        raise HTTPException(status_code=400, detail="No generated files to edit")

    if not request.edit_description.strip():
        raise HTTPException(status_code=400, detail="Edit description cannot be empty")

    background_tasks.add_task(run_edit_loop, job_id, request.edit_description)

    return {"job_id": job_id, "status": "editing"}


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

    return {"download_url": jar_url}
