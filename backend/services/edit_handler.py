import json
import logging
from typing import Dict

from models import ModSpec
from services.model_router import model_router, GROQ_MODEL
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)

EDIT_SYSTEM_PROMPT = """You are editing an existing Minecraft Bedrock add-on file. Apply the user's requested changes.

RULES:
- Output ONLY the modified JSON, no explanations
- Keep the same structure and format_version
- Only change what the user requested
- For damage changes: use {"value": N} format
- For adding effects: add to on_hit_effects or food effects array
- Keep minecraft:icon, minecraft:display_name, minecraft:durability intact unless asked to change
- Output valid JSON only"""


async def apply_edits(
    old_files: Dict[str, str],
    edit_description: str,
    spec: ModSpec,
    edition: str,
    model_preference: str = GROQ_MODEL,
) -> Dict[str, str]:
    """Apply user's edit request to existing generated files."""
    new_files = dict(old_files)

    # Get editable files (skip manifests)
    editable = {p: c for p, c in old_files.items() if "manifest" not in p and (p.endswith(".json") or p.endswith(".js"))}

    file_summary = "\n".join("- %s" % path for path in editable.keys())

    # Step 1: Ask which files need editing
    plan_response = await model_router.chat(
        messages=[
            {"role": "system", "content": "You identify which files need editing. Output ONLY a JSON object: {\"files\": [\"path1\", \"path2\"]}"},
            {"role": "user", "content": "Files:\n%s\n\nEdit: %s\n\nWhich files need changes?" % (file_summary, edit_description)},
        ],
        json_mode=True,
        temperature=0.2,
        max_tokens=512,
        model_preference=model_preference,
    )

    try:
        data = json.loads(plan_response)
        files_to_edit = data.get("files", []) if isinstance(data, dict) else data if isinstance(data, list) else []
    except json.JSONDecodeError:
        files_to_edit = []

    # If LLM couldn't identify files, edit all item files
    if not files_to_edit:
        files_to_edit = [p for p in editable.keys() if "items/" in p]

    # Step 2: Edit each file
    for file_path in files_to_edit:
        if file_path not in old_files:
            matches = [p for p in old_files if file_path in p]
            if matches:
                file_path = matches[0]
            else:
                continue

        current_code = old_files[file_path]

        response = await model_router.chat(
            messages=[
                {"role": "system", "content": EDIT_SYSTEM_PROMPT},
                {"role": "user", "content": "File: %s\n```json\n%s\n```\n\nEdit: %s\n\nOutput modified JSON only." % (file_path, current_code, edit_description)},
            ],
            temperature=0.3,
            max_tokens=4096,
            model_preference=model_preference,
        )

        edited = strip_code_fences(response)
        if edited:
            # Validate it's still valid JSON for .json files
            if file_path.endswith(".json"):
                try:
                    json.loads(edited)
                    new_files[file_path] = edited
                    logger.info("Edited %s" % file_path)
                except json.JSONDecodeError:
                    logger.warning("Edit produced invalid JSON for %s, keeping original" % file_path)
            else:
                new_files[file_path] = edited

    # Step 3: If edit mentions effects, regenerate the script
    effect_keywords = ["lightning", "fire", "freeze", "explosion", "poison", "wither", "knockback",
                       "lifesteal", "blindness", "levitation", "teleport", "effect", "on hit"]
    needs_script_regen = any(k in edit_description.lower() for k in effect_keywords)

    if needs_script_regen:
        # Re-parse item files to rebuild effects
        from services.bedrock_generator import generate_hit_effects_script, _needs_scripts
        # Rebuild spec from edited files
        for path, content in new_files.items():
            if "items/" in path and path.endswith(".json"):
                try:
                    d = json.loads(content)
                    # Don't need to update spec — script is generated from spec
                except json.JSONDecodeError:
                    pass

        if _needs_scripts(spec):
            script = generate_hit_effects_script(spec)
            new_files["behavior_pack/scripts/main.js"] = script
            logger.info("Regenerated hit effects script after edit")

    return new_files
