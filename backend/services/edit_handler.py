import json
import logging
from typing import Dict

from models import ModSpec
from services.model_router import model_router, GROQ_MODEL
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)

EDIT_SYSTEM_PROMPT = """You are editing an existing Minecraft Forge Java mod file. Apply the user's requested changes.

RULES:
- Output ONLY the modified Java source, no explanations or markdown fences
- Keep the same package declaration, class name, and imports unless the change requires new ones
- Preserve the existing Forge annotations and registration scheme
- Only change what the user requested
- For damage/durability tweaks: update the item properties or constructor arguments
- For new effects/behaviours: add the minimum code needed, keep existing logic working
- Output valid, compilable Java only"""


async def apply_edits(
    old_files: Dict[str, str],
    edit_description: str,
    spec: ModSpec,
    model_preference: str = GROQ_MODEL,
) -> Dict[str, str]:
    """Apply user's edit request to existing generated Java source files."""
    new_files = dict(old_files)

    editable = {p: c for p, c in old_files.items() if p.endswith(".java")}

    file_summary = "\n".join("- %s" % path for path in editable.keys())

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

    # Fallback: edit any file whose name looks item-related
    if not files_to_edit:
        files_to_edit = [p for p in editable.keys() if "Item" in p or "Items" in p]

    for file_path in files_to_edit:
        if file_path not in old_files:
            matches = [p for p in old_files if file_path in p]
            if matches:
                file_path = matches[0]
            else:
                continue

        if not file_path.endswith(".java"):
            continue

        current_code = old_files[file_path]

        response = await model_router.chat(
            messages=[
                {"role": "system", "content": EDIT_SYSTEM_PROMPT},
                {"role": "user", "content": "File: %s\n```java\n%s\n```\n\nEdit: %s\n\nOutput modified Java only." % (file_path, current_code, edit_description)},
            ],
            temperature=0.3,
            max_tokens=4096,
            model_preference=model_preference,
        )

        edited = strip_code_fences(response)
        if edited:
            new_files[file_path] = edited
            logger.info("Edited %s" % file_path)

    return new_files
