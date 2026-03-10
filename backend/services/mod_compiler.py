import asyncio
import glob
import logging
import os
from typing import Optional

from config import settings

logger = logging.getLogger(__name__)


class CompileResult:
    def __init__(self, success: bool, output: str = "", jar_path: Optional[str] = None):
        self.success = success
        self.output = output
        self.jar_path = jar_path


async def compile_mod(project_dir: str) -> CompileResult:
    gradlew = os.path.join(project_dir, "gradlew")

    env = os.environ.copy()
    # Auto-detect JAVA_HOME: Docker (Linux) vs macOS (Homebrew)
    if not env.get("JAVA_HOME"):
        if os.path.exists("/usr/lib/jvm/java-17-openjdk-amd64"):
            env["JAVA_HOME"] = "/usr/lib/jvm/java-17-openjdk-amd64"
        elif os.path.exists("/opt/homebrew/opt/openjdk@17"):
            env["JAVA_HOME"] = "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home"
            env["PATH"] = "/opt/homebrew/opt/openjdk@17/bin:" + env.get("PATH", "")

    logger.info(f"Running gradle build in {project_dir}")

    process = await asyncio.create_subprocess_exec(
        gradlew, "build", "--no-daemon",
        cwd=project_dir,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )

    try:
        stdout, stderr = await asyncio.wait_for(
            process.communicate(),
            timeout=settings.build_timeout_seconds,
        )
    except asyncio.TimeoutError:
        process.kill()
        await process.communicate()
        return CompileResult(success=False, output="Build timed out after 5 minutes")

    output = stdout.decode(errors="replace") + "\n" + stderr.decode(errors="replace")
    success = process.returncode == 0

    jar_path = None
    if success:
        jar_path = find_jar(project_dir)

    logger.info(f"Build {'succeeded' if success else 'failed'} (return code: {process.returncode})")
    return CompileResult(success=success, output=output, jar_path=jar_path)


def find_jar(project_dir: str) -> Optional[str]:
    libs_dir = os.path.join(project_dir, "build", "libs")
    if not os.path.exists(libs_dir):
        return None
    jars = glob.glob(os.path.join(libs_dir, "*.jar"))
    if jars:
        return jars[0]
    return None
