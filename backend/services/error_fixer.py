import logging
import os
import re
from typing import Dict, List, Optional

from prompts.fix_prompt import FIX_SYSTEM_PROMPT, FIX_USER_TEMPLATE
from services.model_router import model_router, GROQ_MODEL
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)


def extract_error_files(build_output: str, java_base: str) -> Dict[str, List[str]]:
    """Extract which files have errors and what the errors are."""
    errors_by_file: Dict[str, List[str]] = {}
    # Match patterns like: /path/to/File.java:10: error: message
    pattern = re.compile(r'(/[^\s:]+\.java):(\d+):\s*error:\s*(.*)')
    for match in pattern.finditer(build_output):
        filepath = match.group(1)
        line = match.group(2)
        message = match.group(3)
        filename = os.path.basename(filepath)
        if filename not in errors_by_file:
            errors_by_file[filename] = []
        errors_by_file[filename].append(f"Line {line}: {message}")

    if not errors_by_file:
        error_lines = [line for line in build_output.split('\n') if 'error:' in line.lower()]
        if error_lines:
            errors_by_file["unknown"] = error_lines[:20]

    return errors_by_file


async def fix_compilation_errors(
    project_dir: str,
    build_output: str,
    generated_files: Dict[str, str],
    mod_id: str,
    model_preference: str = GROQ_MODEL,
) -> Dict[str, str]:
    """Attempt to fix compilation errors by sending them to the LLM."""
    java_base = os.path.join(project_dir, "src", "main", "java", "com", "modcreator", mod_id)
    errors_by_file = extract_error_files(build_output, java_base)

    if not errors_by_file:
        logger.warning("No specific errors found in build output")
        truncated_output = "\n".join(build_output.split('\n')[-50:])
        errors_by_file = {"unknown": [truncated_output]}

    fixed_files: Dict[str, str] = {}

    for filename, errors in errors_by_file.items():
        if filename == "unknown":
            for rel_path, code in generated_files.items():
                error_text = "\n".join(errors[:20])
                fixed_code = await _fix_single_file(rel_path, code, error_text, model_preference=model_preference)
                if fixed_code:
                    fixed_files[rel_path] = fixed_code
            break

        for rel_path, code in generated_files.items():
            if rel_path.endswith(filename):
                error_text = "\n".join(errors[:20])
                fixed_code = await _fix_single_file(rel_path, code, error_text, model_preference=model_preference)
                if fixed_code:
                    fixed_files[rel_path] = fixed_code
                break

    # Write fixed files back to disk
    for rel_path, code in fixed_files.items():
        full_path = os.path.join(java_base, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(code)

    return fixed_files


async def _fix_single_file(filename: str, code: str, errors: str, model_preference: str = GROQ_MODEL) -> Optional[str]:
    prompt = FIX_USER_TEMPLATE.format(
        errors=errors,
        filename=filename,
        code=code,
    )

    try:
        response = await model_router.chat(
            messages=[
                {"role": "system", "content": FIX_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=4096,
            model_preference=model_preference,
        )
        return strip_code_fences(response)
    except Exception as e:
        logger.error(f"Failed to fix {filename}: {e}")
        return None
