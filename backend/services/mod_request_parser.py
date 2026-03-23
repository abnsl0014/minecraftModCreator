import json
import logging
import re
from typing import Optional

from models import ModSpec, ItemSpec, BlockSpec
from prompts.parse_prompt import PARSE_SYSTEM_PROMPT, PARSE_USER_TEMPLATE
from services.model_router import model_router, GROQ_MODEL

logger = logging.getLogger(__name__)


def sanitize_mod_id(name: str) -> str:
    mod_id = name.lower().strip()
    mod_id = re.sub(r'[^a-z0-9_]', '_', mod_id)
    mod_id = re.sub(r'_+', '_', mod_id).strip('_')
    return mod_id[:32]


async def parse_mod_request(description: str, mod_name: Optional[str] = None, model_preference: str = GROQ_MODEL) -> ModSpec:
    mod_name_line = f"Suggested mod name: {mod_name}" if mod_name else ""

    user_msg = PARSE_USER_TEMPLATE.format(
        description=description,
        mod_name_line=mod_name_line,
    )

    response = await model_router.chat(
        messages=[
            {"role": "system", "content": PARSE_SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        json_mode=True,
        temperature=0.3,
        max_tokens=2048,
        model_preference=model_preference,
    )

    data = json.loads(response)

    items = [ItemSpec(**item) for item in data.get("items", [])]
    blocks = [BlockSpec(**block) for block in data.get("blocks", [])]

    mod_id = sanitize_mod_id(data.get("mod_id", mod_name or "custom_mod"))

    return ModSpec(
        mod_id=mod_id,
        mod_name=data.get("mod_name", mod_name or "Custom Mod"),
        mod_description=data.get("mod_description", description[:200]),
        items=items,
        blocks=blocks,
    )
