import logging
import os
import shutil

from config import settings

logger = logging.getLogger(__name__)


def create_build_dir(job_id: str) -> str:
    build_dir = os.path.join(settings.temp_dir_base, job_id)
    os.makedirs(build_dir, exist_ok=True)
    return build_dir


def cleanup_build_dir(job_id: str):
    build_dir = os.path.join(settings.temp_dir_base, job_id)
    if os.path.exists(build_dir):
        try:
            shutil.rmtree(build_dir)
            logger.info("Cleaned up build dir for job %s" % job_id)
        except Exception as e:
            logger.warning("Failed to clean up build dir for job %s: %s" % (job_id, e))
