import logging
import os

from config import settings
from models import GenerateRequest
from services.job_manager import update_job
from services.mod_request_parser import parse_mod_request
from services.code_generator import generate_all_code
from services.mod_assembler import assemble_mod
from services.mod_compiler import compile_mod
from services.error_fixer import fix_compilation_errors
from services.bedrock_generator import generate_all_bedrock_code
from services.bedrock_assembler import assemble_bedrock_addon
from services.ai_texture_generator import generate_all_textures
from services.mechanics_engine import analyze_and_enrich
from utils.file_utils import create_build_dir
from utils.supabase_client import supabase

logger = logging.getLogger(__name__)


async def run_agent_loop(job_id: str, request: GenerateRequest):
    edition = request.edition
    model = request.model
    try:
        # Step 1: Processing user prompt
        await update_job(job_id, status="parsing", progress_message="Processing user prompt...")
        spec = await parse_mod_request(request.description, request.mod_name, model_preference=model)
        spec.author_name = request.author_name

        # Inject custom textures
        if request.custom_textures:
            tex_map = {t.registry_name: t.custom_texture for t in request.custom_textures}
            for item in spec.items:
                if item.registry_name in tex_map:
                    item.custom_texture = tex_map[item.registry_name]
            if not any(item.custom_texture for item in spec.items):
                for i, ct in enumerate(request.custom_textures):
                    if i < len(spec.items) and ct.custom_texture:
                        spec.items[i].custom_texture = ct.custom_texture

        items_summary = []
        for i in spec.items:
            items_summary.append(i.display_name)
        for b in spec.blocks:
            items_summary.append(b.display_name)

        await update_job(
            job_id,
            mod_id=spec.mod_id,
            progress_message="Processing user prompt... Done\nAnalyzing item mechanics...",
        )

        # Step 1.5: Mechanics Engine — reason about HOW each item works
        analysis = analyze_and_enrich(spec)
        logger.info("Mechanics: %s" % analysis)

        # Save enriched spec
        await update_job(
            job_id,
            mod_spec=spec.model_dump(),
            progress_message="Processing user prompt... Done\nAnalyzing item mechanics... Done\nGenerating mod details: %s" % ", ".join(items_summary),
        )

        if edition == "bedrock":
            await _run_bedrock_loop(job_id, spec, model_preference=model)
        else:
            await _run_java_loop(job_id, spec, model_preference=model)

    except Exception as e:
        logger.exception("Agent loop error for job %s" % job_id)
        await update_job(
            job_id,
            status="failed",
            progress_message="An unexpected error occurred",
            error=str(e)[:2000],
        )


async def _run_bedrock_loop(job_id: str, spec, model_preference: str = "gpt-oss-120b"):
    """Bedrock: generate JSON files, zip into .mcaddon. No compilation needed."""
    # Step 2: Generating code
    await update_job(job_id, status="generating", progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code...")
    generated_files = await generate_all_bedrock_code(spec, model_preference=model_preference)
    logger.info("Generated %d Bedrock files" % len(generated_files))
    await update_job(job_id, generated_files=generated_files)

    # Step 3: Crafting textures
    await update_job(job_id, progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code... Done\nCrafting textures...")
    build_dir = create_build_dir(job_id)
    await generate_all_textures(spec, build_dir, edition="bedrock")

    # Step 4: Packaging files
    await update_job(job_id, status="compiling", iteration=1, progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code... Done\nCrafting textures... Done\nPackaging files...")
    mcaddon_path = assemble_bedrock_addon(job_id, spec, generated_files)

    # Step 5: Upload
    addon_url = await upload_file(job_id, mcaddon_path, "%s.mcaddon" % spec.mod_id)
    await update_job(
        job_id,
        status="complete",
        progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code... Done\nCrafting textures... Done\nPackaging files... Done",
        jar_file_url=addon_url,
        jar_file_path=mcaddon_path,
    )
    logger.info("Bedrock job %s completed" % job_id)


async def _run_java_loop(job_id: str, spec, model_preference: str = "gpt-oss-120b"):
    """Java: generate code, compile with Gradle, fix loop."""
    # Step 2: Generate code
    await update_job(job_id, status="generating", progress_message="Generating mod code...")
    generated_files = await generate_all_code(spec, model_preference=model_preference)
    logger.info("Generated %d files: %s" % (len(generated_files), list(generated_files.keys())))

    # Store generated files for editing
    await update_job(job_id, generated_files=generated_files)

    # Step 3: Assemble the project
    await update_job(job_id, progress_message="Assembling mod project...")
    project_dir = assemble_mod(job_id, spec, generated_files)

    # Step 3.5: Generate AI textures (overwrites solid color fallbacks)
    await update_job(job_id, progress_message="Creating pixel art textures...")
    await generate_all_textures(spec, project_dir, edition="java")

    # Step 4: Compile + fix loop
    max_iterations = settings.max_fix_iterations
    for iteration in range(1, max_iterations + 1):
        await update_job(
            job_id,
            status="compiling",
            iteration=iteration,
            progress_message="Compiling mod (attempt %d/%d)..." % (iteration, max_iterations),
        )

        result = await compile_mod(project_dir)

        if result.success:
            jar_url = await upload_file(job_id, result.jar_path, "%s-1.0.0.jar" % spec.mod_id)
            await update_job(
                job_id,
                status="complete",
                progress_message="Mod built successfully!",
                jar_file_url=jar_url,
                jar_file_path=result.jar_path,
            )
            logger.info("Job %s completed on iteration %d" % (job_id, iteration))
            return

        if iteration < max_iterations:
            await update_job(
                job_id,
                status="fixing",
                progress_message="Fixing compilation errors (attempt %d/%d)..." % (iteration, max_iterations),
            )
            fixed_files = await fix_compilation_errors(
                project_dir, result.output, generated_files, spec.mod_id,
                model_preference=model_preference,
            )
            generated_files.update(fixed_files)
            await update_job(job_id, generated_files=generated_files)

    error_summary = result.output[-2000:] if result.output else "Unknown build error"
    await update_job(
        job_id,
        status="failed",
        progress_message="Could not compile mod after all attempts",
        error=error_summary,
    )


async def run_edit_loop(job_id: str, edit_description: str):
    """Re-generate mod with edits applied."""
    from services.job_manager import get_job
    from services.edit_handler import apply_edits
    from models import ModSpec

    job = await get_job(job_id)
    if not job:
        return

    # Clear old error when starting edit
    await update_job(job_id, error=None, status="generating", progress_message="Processing edit request...")

    edition = job.get("edition", "java")
    model_preference = job.get("model_used", "gpt-oss-120b")
    spec_data = job.get("mod_spec", {})
    old_files = job.get("generated_files", {})

    if not spec_data:
        await update_job(job_id, status="failed", error="No mod spec found for editing")
        return

    spec = ModSpec(**spec_data)

    try:
        await update_job(job_id, status="generating",
            progress_message="Processing edit request... Done\nApplying changes to code...")

        # Apply edits to existing files
        new_files = await apply_edits(old_files, edit_description, spec, edition, model_preference=model_preference)

        if edition == "bedrock":
            await update_job(job_id, generated_files=new_files,
                progress_message="Processing edit request... Done\nApplying changes to code... Done\nRegenerating textures...")

            build_dir = create_build_dir(job_id)
            await generate_all_textures(spec, build_dir, edition="bedrock")

            await update_job(job_id, status="compiling",
                progress_message="Processing edit request... Done\nApplying changes to code... Done\nRegenerating textures... Done\nPackaging files...")

            mcaddon_path = assemble_bedrock_addon(job_id, spec, new_files)
            addon_url = await upload_file(job_id, mcaddon_path, "%s.mcaddon" % spec.mod_id)
            await update_job(
                job_id, status="complete",
                progress_message="Processing edit request... Done\nApplying changes to code... Done\nRegenerating textures... Done\nPackaging files... Done",
                jar_file_url=addon_url,
            )
        else:
            await update_job(job_id, generated_files=new_files,
                           progress_message="Rebuilding mod...")
            project_dir = assemble_mod(job_id, spec, new_files)

            max_iterations = settings.max_fix_iterations
            for iteration in range(1, max_iterations + 1):
                await update_job(job_id, status="compiling", iteration=iteration,
                               progress_message="Compiling edited mod (attempt %d/%d)..." % (iteration, max_iterations))
                result = await compile_mod(project_dir)
                if result.success:
                    jar_url = await upload_file(job_id, result.jar_path, "%s-1.0.0.jar" % spec.mod_id)
                    await update_job(job_id, status="complete",
                                   progress_message="Edited mod built!",
                                   jar_file_url=jar_url)
                    return
                if iteration < max_iterations:
                    await update_job(job_id, status="fixing",
                                   progress_message="Fixing errors (attempt %d/%d)..." % (iteration, max_iterations))
                    fixed = await fix_compilation_errors(project_dir, result.output, new_files, spec.mod_id, model_preference=model_preference)
                    new_files.update(fixed)

            await update_job(job_id, status="failed",
                           progress_message="Could not compile after edits",
                           error=result.output[-2000:])

    except Exception as e:
        logger.exception("Edit loop error for job %s" % job_id)
        await update_job(job_id, status="failed", error=str(e)[:2000])


async def upload_file(job_id: str, file_path: str, filename: str) -> str:
    storage_path = "%s/%s" % (job_id, filename)

    with open(file_path, "rb") as f:
        file_bytes = f.read()

    # Delete existing file if re-uploading (for edits)
    try:
        supabase.storage.from_("mod-jars").remove([storage_path])
    except Exception:
        pass

    supabase.storage.from_("mod-jars").upload(
        path=storage_path,
        file=file_bytes,
        file_options={"content-type": "application/octet-stream"},
    )

    return supabase.storage.from_("mod-jars").get_public_url(storage_path)
