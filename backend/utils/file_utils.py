import os
import shutil

from config import settings


def create_build_dir(job_id: str) -> str:
    build_dir = os.path.join(settings.temp_dir_base, job_id)
    os.makedirs(build_dir, exist_ok=True)
    return build_dir


def cleanup_build_dir(job_id: str):
    build_dir = os.path.join(settings.temp_dir_base, job_id)
    if os.path.exists(build_dir):
        shutil.rmtree(build_dir, ignore_errors=True)
