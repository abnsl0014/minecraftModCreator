import logging
import os
import shutil

from config import settings
from models import GenerateRequest
from services.job_manager import update_job, get_job
from services.mod_request_parser import parse_mod_request
from services.code_generator import generate_all_code
from services.mod_assembler import assemble_mod
from services.bedrock_generator import generate_all_bedrock_code
from services.bedrock_assembler import assemble_bedrock_addon
from services.ai_texture_generator import generate_all_textures, collect_texture_previews
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

        # Cap items/blocks to prevent resource exhaustion
        MAX_ITEMS = 30
        MAX_BLOCKS = 20
        if len(spec.items) > MAX_ITEMS:
            spec.items = spec.items[:MAX_ITEMS]
            logger.warning("Job %s: truncated items to %d" % (job_id, MAX_ITEMS))
        if len(spec.blocks) > MAX_BLOCKS:
            spec.blocks = spec.blocks[:MAX_BLOCKS]
            logger.warning("Job %s: truncated blocks to %d" % (job_id, MAX_BLOCKS))

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
        import traceback
        error_detail = str(e) or repr(e) or traceback.format_exc()
        logger.exception("Agent loop error for job %s: %s" % (job_id, error_detail))
        # Sanitize error for client — don't expose internal paths or stack traces
        safe_error = str(e)[:200] if str(e) else "An unexpected error occurred"
        await update_job(
            job_id,
            status="failed",
            progress_message="An unexpected error occurred",
            error=safe_error,
        )
        # Refund the token we deducted at /api/generate — the user got nothing.
        try:
            job = await get_job(job_id)
            owner_id = job.get("user_id") if job else None
            if owner_id:
                from routers.user import add_tokens
                await add_tokens(owner_id, 1, "mod_generation_refund")
                logger.info("Refunded 1 token to %s for failed job %s" % (owner_id, job_id))
        except Exception:
            logger.exception("Failed to refund token for job %s" % job_id)
    finally:
        # Always clean up temp files
        from utils.file_utils import cleanup_build_dir
        cleanup_build_dir(job_id)


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

    # Collect texture previews for the frontend
    previews = collect_texture_previews(spec, build_dir, edition="bedrock")

    # Step 4: Packaging files
    await update_job(job_id, status="packaging", progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code... Done\nCrafting textures... Done\nPackaging files...")
    mcaddon_path = assemble_bedrock_addon(job_id, spec, generated_files)

    # Step 5: Upload
    addon_url = await upload_file(job_id, mcaddon_path, "%s.mcaddon" % spec.mod_id)
    await update_job(
        job_id,
        status="complete",
        progress_message="Processing user prompt... Done\nGenerating mod details... Done\nGenerating code... Done\nCrafting textures... Done\nPackaging files... Done",
        jar_file_url=addon_url,
        jar_file_path=mcaddon_path,
        texture_previews=previews,
    )
    logger.info("Bedrock job %s completed" % job_id)


async def _run_java_loop(job_id: str, spec, model_preference: str = "gpt-oss-120b"):
    """Java: generate code, assemble project, package as ZIP (no compilation)."""
    # Step 2: Generate code
    await update_job(job_id, status="generating", progress_message="Processing user prompt... Done\nGenerating mod code...")
    generated_files = await generate_all_code(spec, model_preference=model_preference)
    logger.info("Generated %d files: %s" % (len(generated_files), list(generated_files.keys())))

    # Store generated files for editing
    await update_job(job_id, generated_files=generated_files)

    # Step 3: Assemble the project
    await update_job(job_id, progress_message="Processing user prompt... Done\nGenerating mod code... Done\nAssembling mod project...")
    project_dir = assemble_mod(job_id, spec, generated_files)

    # Step 3.5: Generate AI textures (overwrites solid color fallbacks)
    await update_job(job_id, progress_message="Processing user prompt... Done\nGenerating mod code... Done\nAssembling mod project... Done\nCrafting textures...")
    await generate_all_textures(spec, project_dir, edition="java")

    # Collect texture previews for the frontend
    previews = collect_texture_previews(spec, project_dir, edition="java")

    # Step 4: Package as ZIP
    await update_job(job_id, status="packaging", progress_message="Processing user prompt... Done\nGenerating mod code... Done\nAssembling mod project... Done\nCrafting textures... Done\nPackaging project...")
    zip_filename = "%s-forge-project" % spec.mod_id
    zip_path = shutil.make_archive(
        os.path.join(settings.temp_dir_base, job_id, zip_filename),
        "zip",
        root_dir=os.path.dirname(project_dir),
        base_dir=os.path.basename(project_dir),
    )

    # Step 5: Upload
    zip_url = await upload_file(job_id, zip_path, "%s-forge-project.zip" % spec.mod_id)
    await update_job(
        job_id,
        status="complete",
        progress_message="Processing user prompt... Done\nGenerating mod code... Done\nAssembling mod project... Done\nCrafting textures... Done\nPackaging project... Done",
        jar_file_url=zip_url,
        jar_file_path=zip_path,
        texture_previews=previews,
    )
    logger.info("Java job %s completed (ZIP packaged)" % job_id)


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
            previews = collect_texture_previews(spec, build_dir, edition="bedrock")

            await update_job(job_id, status="packaging",
                progress_message="Processing edit request... Done\nApplying changes to code... Done\nRegenerating textures... Done\nPackaging files...")

            mcaddon_path = assemble_bedrock_addon(job_id, spec, new_files)
            addon_url = await upload_file(job_id, mcaddon_path, "%s.mcaddon" % spec.mod_id)
            await update_job(
                job_id, status="complete",
                progress_message="Processing edit request... Done\nApplying changes to code... Done\nRegenerating textures... Done\nPackaging files... Done",
                jar_file_url=addon_url,
                texture_previews=previews,
            )
        else:
            await update_job(job_id, generated_files=new_files,
                           progress_message="Processing edit request... Done\nApplying changes to code... Done\nRebuilding mod...")
            project_dir = assemble_mod(job_id, spec, new_files)

            await update_job(job_id, progress_message="Processing edit request... Done\nApplying changes to code... Done\nRebuilding mod... Done\nCrafting textures...")
            await generate_all_textures(spec, project_dir, edition="java")
            previews = collect_texture_previews(spec, project_dir, edition="java")

            await update_job(job_id, status="packaging",
                           progress_message="Processing edit request... Done\nApplying changes to code... Done\nRebuilding mod... Done\nCrafting textures... Done\nPackaging project...")
            zip_filename = "%s-forge-project" % spec.mod_id
            zip_path = shutil.make_archive(
                os.path.join(settings.temp_dir_base, job_id, zip_filename),
                "zip",
                root_dir=os.path.dirname(project_dir),
                base_dir=os.path.basename(project_dir),
            )
            zip_url = await upload_file(job_id, zip_path, "%s-forge-project.zip" % spec.mod_id)
            await update_job(job_id, status="complete",
                           progress_message="Processing edit request... Done\nApplying changes to code... Done\nRebuilding mod... Done\nCrafting textures... Done\nPackaging project... Done",
                           jar_file_url=zip_url,
                           texture_previews=previews)

    except Exception as e:
        logger.exception("Edit loop error for job %s" % job_id)
        safe_error = str(e)[:200] if str(e) else "Edit failed"
        await update_job(job_id, status="failed", error=safe_error)
    finally:
        from utils.file_utils import cleanup_build_dir
        cleanup_build_dir(job_id)


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
