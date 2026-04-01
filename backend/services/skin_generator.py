import json
import logging
import os
from typing import Optional

from PIL import Image

from prompts.skin_prompt import SKIN_SYSTEM_PROMPT, SKIN_USER_TEMPLATE
from services.model_router import model_router, GROQ_MODEL

logger = logging.getLogger(__name__)


def _hex_to_rgba(hex_color: str) -> tuple:
    """Convert hex color string to RGBA tuple."""
    hex_color = hex_color.lstrip("#")
    if len(hex_color) == 8:
        r, g, b, a = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, a)
    if len(hex_color) == 6:
        r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
        return (r, g, b, 255)
    return (0, 0, 0, 0)


def _render_skin_png(pixels: list, output_path: str) -> bool:
    """Render a 64x64 pixel grid to a PNG skin file."""
    img = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    px = img.load()
    for y in range(min(64, len(pixels))):
        row = pixels[y]
        for x in range(min(64, len(row))):
            color = row[x]
            if color in ("#00000000", "transparent", "#0000"):
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = _hex_to_rgba(color)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)
    return True


async def generate_skin(
    description: str,
    output_path: str,
    model_preference: str = GROQ_MODEL,
) -> Optional[str]:
    """Generate a 64x64 Minecraft player skin PNG from a text description.

    Returns the output path on success, None on failure.
    """
    try:
        prompt = SKIN_USER_TEMPLATE.format(description=description)

        response = await model_router.chat(
            messages=[
                {"role": "system", "content": SKIN_SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=65000,
            json_mode=True,
            model_preference=model_preference,
        )

        data = json.loads(response)
        pixels = data.get("pixels", [])

        if len(pixels) < 64:
            logger.warning(
                "Skin generation: got %d rows, expected 64", len(pixels)
            )
            return None

        # Pad rows to 64 columns if needed
        for i in range(len(pixels)):
            if len(pixels[i]) < 64:
                pixels[i].extend(["#00000000"] * (64 - len(pixels[i])))

        _render_skin_png(pixels, output_path)
        logger.info("Generated skin: %s", output_path)
        return output_path

    except Exception as e:
        logger.error("Skin generation failed: %s", e)
        return None


def skin_to_base64(skin_path: str) -> Optional[str]:
    """Read a skin PNG and return as base64 data URL."""
    import base64

    if not os.path.exists(skin_path):
        return None
    with open(skin_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    return "data:image/png;base64," + b64
