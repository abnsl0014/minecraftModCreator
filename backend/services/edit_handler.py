import logging
from typing import Dict

from models import ModSpec
from utils.groq_client import groq_client
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)

EDIT_SYSTEM_PROMPT = """You are editing an existing Minecraft mod file. Apply the user's requested changes.

CRITICAL RULES:
- Output ONLY the modified code/JSON, no explanations
- Keep the same structure and format
- Only change what the user requested
- For Java: start with 'package' and end with '}'
- For JSON: output valid JSON only
- Do NOT use Material class (removed in 1.20.1 Java)
- Do NOT use .tab() on Item.Properties (removed in 1.20.1 Java)"""


async def apply_edits(
    old_files: Dict[str, str],
    edit_description: str,
    spec: ModSpec,
    edition: str,
) -> Dict[str, str]:
    """Apply user's edit request to existing generated files."""
    new_files = dict(old_files)

    # Send all files + edit request to the LLM, ask it which files need changes
    file_summary = "\n".join(
        "- %s (%d chars)" % (path, len(content))
        for path, content in old_files.items()
        if not path.endswith("manifest.json")  # skip manifests
    )

    # First, ask which files need editing
    plan_response = await groq_client.chat(
        messages=[
            {"role": "system", "content": "You identify which files need editing in a Minecraft mod. Output ONLY a JSON object like {\"files\": [\"path1\", \"path2\"]}."},
            {"role": "user", "content": "Files in the mod:\n%s\n\nEdit request: %s\n\nWhich files need to be modified? Output JSON with a \"files\" array." % (file_summary, edit_description)},
        ],
        json_mode=True,
        temperature=0.2,
        max_tokens=512,
    )

    import json
    try:
        data = json.loads(plan_response)
        if isinstance(data, dict):
            files_to_edit = data.get("files", [])
        elif isinstance(data, list):
            files_to_edit = data
        else:
            files_to_edit = [p for p in old_files.keys() if "manifest" not in p]
    except json.JSONDecodeError:
        files_to_edit = [p for p in old_files.keys() if "manifest" not in p]

    # Edit each identified file
    for file_path in files_to_edit:
        if file_path not in old_files:
            # Try partial match
            matches = [p for p in old_files if file_path in p]
            if matches:
                file_path = matches[0]
            else:
                continue

        current_code = old_files[file_path]

        response = await groq_client.chat(
            messages=[
                {"role": "system", "content": EDIT_SYSTEM_PROMPT},
                {"role": "user", "content": "Current file (%s):\n```\n%s\n```\n\nEdit request: %s\n\nOutput the modified file." % (file_path, current_code, edit_description)},
            ],
            temperature=0.3,
            max_tokens=4096,
        )

        edited = strip_code_fences(response)
        if edited:
            new_files[file_path] = edited

    return new_files
