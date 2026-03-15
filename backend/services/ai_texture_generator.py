import asyncio
import json
import logging
import os
import shutil
from typing import List, Tuple

from PIL import Image

from utils.groq_client import groq_client

logger = logging.getLogger(__name__)

TEXTURE_PROMPT = """You are a Minecraft pixel art texture designer. Generate a 16x16 pixel art texture for a Minecraft {item_type} called "{name}".
{description_line}

Output ONLY a JSON object with a "pixels" key containing an array of 16 rows, each row being an array of 16 hex color strings (e.g. "#FF0000").
Use "#00000000" for transparent pixels (areas outside the item shape).

{type_guide}

General Minecraft texture rules:
- Keep palette limited to 8-12 colors for authentic Minecraft feel
- Use 2-3 shades of each color (light highlight, base, dark shadow)
- Light source comes from top-left: top/left edges are lighter, bottom/right edges are darker
- Textures should look recognizable at 16x16 — use bold, clear shapes
- Items are drawn DIAGONALLY from bottom-left to top-right (Minecraft convention)
- The item should fill most of the 16x16 grid

Output ONLY the JSON, no other text."""

# Detailed visual guides for each item type, teaching the LLM exactly how Minecraft textures look
TYPE_GUIDES = {
    "sword": """MINECRAFT SWORD TEXTURE GUIDE:
Swords in Minecraft are drawn DIAGONALLY from bottom-left to top-right on a 16x16 grid.
- The blade is a thin diagonal stripe (1-2px wide) running from roughly (2,14) to (12,2)
- Blade uses 2-3 shades: bright highlight edge, base color, darker back edge
- The crossguard/hilt is a small 3-4px horizontal bar near the bottom-center of the blade
- The handle extends 3-4px below the crossguard, using brown/wood tones (#8B6914, #6B4C12, #4A3409)
- Entire background is transparent (#00000000)
- Diamond sword blade: light cyan (#6CECEC) to teal (#2D9393)
- Iron sword blade: light gray (#D8D8D8) to dark gray (#727272)
- Netherite sword: dark brown-black (#443333) with subtle purple highlights
- For custom materials: use the primary color for the blade with lighter/darker variants for shading""",

    "katana": """MINECRAFT KATANA TEXTURE GUIDE:
Katanas are drawn DIAGONALLY like swords but with a longer, thinner, slightly curved blade.
- Thin elegant blade (1px wide) running diagonally from bottom-left to top-right
- Blade should appear slightly curved — offset middle pixels by 1
- Use bright white/silver edge (#E8E8E8) with the colored blade body
- The tsuba (guard) is a small round 2x2 shape where blade meets handle
- Handle is wrapped — alternate between two dark colors to show wrapping pattern (#2A1A0A, #3D2814)
- The pommel at the very bottom is a small 1-2px accent
- Background is fully transparent (#00000000)""",

    "bow": """MINECRAFT BOW TEXTURE GUIDE:
Bows in Minecraft are drawn as a curved arc shape.
- The bow limbs form a "(" curve shape on the left-center of the texture
- Wood grain on the bow limbs: use browns (#8B6914, #6B4C12, #4A3409)
- A bowstring runs vertically as a thin 1px line on the right side, color (#FFFFFF) or (#E8E8E8)
- The grip/handle area in the middle is slightly thicker (2px)
- The bow tips (top and bottom) taper to 1px
- Background is fully transparent""",

    "axe": """MINECRAFT AXE WEAPON TEXTURE GUIDE:
Battle axes are drawn DIAGONALLY from bottom-left to top-right.
- The axe head is at the top-right: a broad wedge shape, roughly 5-6px wide and 5-6px tall
- Axe head uses metallic shading: light edge (#D8D8D8), body (#A0A0A0), dark inner (#727272)
- For colored axes, replace gray with the primary color shades
- The handle runs diagonally from the axe head to bottom-left
- Handle is wooden brown (#8B6914 to #4A3409), 1-2px wide
- Background is fully transparent""",

    "staff": """MINECRAFT STAFF/WAND TEXTURE GUIDE:
Staves are drawn DIAGONALLY from bottom-left to top-right.
- A long thin rod (1-2px wide) running the full diagonal
- The rod/shaft uses wood or metal tones
- The top has an ornate head: a gem, crystal, or magical element (3-4px)
- The gem/crystal at the top glows: use bright saturated color with a white highlight pixel
- The shaft may have decorative bands/rings at intervals
- Bottom may have a small cap or point
- Background is fully transparent""",

    "hammer": """MINECRAFT HAMMER TEXTURE GUIDE:
Hammers are drawn DIAGONALLY from bottom-left to top-right.
- Large heavy rectangular head at top-right (5-7px wide, 3-4px tall)
- The hammer head is blocky and massive — this is Minecraft style
- Head uses metallic shading with the primary color
- One side of the head may be flat, other side slightly rounded
- Handle is sturdy wood (2px wide) running diagonally to bottom-left
- Handle uses brown tones (#8B6914, #6B4C12, #4A3409)
- Background is fully transparent""",

    "spear": """MINECRAFT SPEAR TEXTURE GUIDE:
Spears are drawn DIAGONALLY from bottom-left to top-right.
- Very long thin shaft (1px wide) spanning most of the diagonal
- The spearhead at top-right is a pointed triangle shape (3-4px)
- Spearhead uses metallic or colored shading — bright tip, darker base
- Shaft is wooden brown or the primary color
- May have small decorative wrapping near the head
- Background is fully transparent""",

    "pickaxe": """MINECRAFT PICKAXE TEXTURE GUIDE:
Pickaxes are drawn DIAGONALLY from bottom-left to top-right.
- The pickaxe head is at the top-right: a T-shaped or curved pick head
- Head has two pointed prongs extending left and right from where the handle meets
- Each prong is 3-4px long, tapering to a point
- Head material uses 2-3 shades: diamond (#6CECEC/#2D9393), iron (#D8D8D8/#727272), or custom color
- Handle runs diagonally to bottom-left, wooden brown (#8B6914, #6B4C12), 1-2px wide
- Background is fully transparent""",

    "shovel": """MINECRAFT SHOVEL TEXTURE GUIDE:
Shovels are drawn DIAGONALLY from bottom-left to top-right.
- The shovel blade is at the top-right: a rounded rectangular scoop shape (3-4px wide, 4-5px tall)
- The blade has a slightly rounded bottom edge
- Blade uses metallic shading: light edge, base color, dark shadow
- A small neck connects the blade to the handle (1px transition)
- Handle runs diagonally to bottom-left, wooden brown, 1-2px wide
- Background is fully transparent""",

    "hoe": """MINECRAFT HOE TEXTURE GUIDE:
Hoes are drawn DIAGONALLY from bottom-left to top-right.
- The hoe blade is at the top-right: a flat rectangular blade extending to one side (3-4px wide, 2px tall)
- Blade is perpendicular to the handle direction
- Uses metallic shading with 2-3 color shades
- Handle runs diagonally to bottom-left, wooden brown, 1-2px wide
- Background is fully transparent""",

    "helmet": """MINECRAFT HELMET/ARMOR TEXTURE GUIDE:
Armor pieces in Minecraft inventory are drawn as the armor item viewed from the front.
- Helmet: a rounded cap shape filling the upper 2/3 of the texture
- Has a face opening/visor area (darker or transparent) in the lower-center
- The top is rounded with a highlight
- Sides come down to ear level
- Use metallic shading: bright highlight on top (#E8E8E8), base color in middle, darker shadow on bottom
- For leather: use softer brown tones. For metal: use the primary color with metallic sheen
- Background is fully transparent""",

    "chestplate": """MINECRAFT CHESTPLATE TEXTURE GUIDE:
Chestplate viewed from the front as an inventory icon.
- A torso-shaped armor piece: broad shoulders, narrowing at waist
- Rough shape: wide top (10-12px), tapering to 6-8px at bottom
- Has a collar/neckline indent at the top center
- Short sleeve shapes extending from the shoulders (2-3px each side)
- Metallic shading: highlights on the chest/shoulder tops, shadows on the bottom
- May have a center line or decorative element
- Use the primary color with lighter/darker variants
- Background is fully transparent""",

    "leggings": """MINECRAFT LEGGINGS TEXTURE GUIDE:
Leggings viewed from the front as an inventory icon.
- Two leg shapes side by side with a gap between them
- Waistband at top (wider, ~8px), each leg ~3px wide tapering slightly
- Legs extend from waist to near bottom of texture
- Belt/waistband detail at top
- Metallic shading on each leg: highlight on outer edge, shadow on inner edge
- Use the primary color with lighter/darker variants
- Background is fully transparent""",

    "boots": """MINECRAFT BOOTS TEXTURE GUIDE:
Boots viewed from the front as an inventory icon.
- Two boot shapes side by side, each roughly 4-5px wide, 6-7px tall
- Each boot has: an ankle/shaft part (upper, narrower) and a foot part (lower, extending forward)
- The toe extends slightly forward at the bottom
- A small sole line at the very bottom (darker shade)
- Metallic shading: highlight on top/front, shadow on back/bottom
- Use the primary color with lighter/darker variants
- Background is fully transparent""",

    "food": """MINECRAFT FOOD TEXTURE GUIDE:
Food items in Minecraft are drawn as recognizable food shapes viewed from above or at 3/4 angle.
- Apple: roundish shape, 8-10px, red (#CC3333) with green leaf (#33AA33) at top, stem (#6B4C12)
- Bread: elongated oval, golden-brown (#DAA520) with darker crust (#8B6914) and lighter crumb (#F0D080)
- Steak/meat: irregular organic shape, reddish-brown (#993333) with pink interior (#CC6666) and darker edges
- Pie: circular/square with crimped edges, golden crust with colored filling visible on top
- Berries/fruit: small round cluster, bright saturated colors with tiny highlight dots
- Cooked items: warm golden-brown tones with char marks (darker spots)
- Golden food: bright gold (#FFD700) base with yellow (#FFFF55) highlights
- For custom food: use organic rounded shapes, warm appetizing colors, 2-3 shade variations
- Food never has perfectly straight edges — use slightly irregular organic outlines
- Background is fully transparent""",

    "block": """MINECRAFT BLOCK TEXTURE GUIDE:
Block textures must tile seamlessly — they repeat across all faces of a cube.
- Stone: gray (#808080) base with random darker (#707070) and lighter (#909090) spots, subtle noise pattern
- Wood planks: horizontal plank lines with wood grain, warm browns with line separations
- Ore blocks: stone base (#808080/#707070) with clusters of 2-4px colored ore spots scattered around
- Gem blocks: saturated solid color with faceted/crystalline pattern — lighter center, darker edges, diagonal highlight lines
- Metal blocks: light metallic sheen with subtle horizontal/grid line pattern, bright top-left corner
- Brick: alternating rectangular brick pattern with mortar lines (#C8C8C8)
- Dirt: brown (#8B6914) with random darker/lighter spots and tiny pebble details
- Glass: mostly transparent with thin white frame lines at edges and subtle blue tint
- Glowing blocks: bright saturated center fading to darker edges, or veins of light color on darker base
- The texture MUST tile: left edge should flow into right edge, top into bottom
- DO NOT make it transparent — blocks are fully opaque (every pixel has a color)
- Use subtle noise/variation — never large flat areas of one color""",
}

# Fallback for unrecognized types
DEFAULT_TYPE_GUIDE = """MINECRAFT ITEM TEXTURE GUIDE:
Draw the item diagonally from bottom-left to top-right on the 16x16 grid.
- Use 2-3 shades of the primary color for depth
- Add highlights on the top-left edges, shadows on bottom-right
- Keep the shape recognizable and bold
- Background is fully transparent (#00000000)"""


def hex_to_rgb(hex_color: str) -> Tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 8:
        hex_color = hex_color[:6]
    if len(hex_color) != 6:
        return (128, 128, 128)
    try:
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    except ValueError:
        return (128, 128, 128)


def render_pixel_grid(pixels: List[List[str]], output_path: str, target_size: int = 0):
    """Render a grid of hex colors to a PNG file. Optionally scale to target_size."""
    size = len(pixels)
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    px = img.load()
    for y in range(min(size, len(pixels))):
        row = pixels[y]
        for x in range(min(size, len(row))):
            color = row[x]
            if color in ("#00000000", "transparent", "#0000", "#000000FF"):
                px[x, y] = (0, 0, 0, 0)
            else:
                rgb = hex_to_rgb(color)
                px[x, y] = (*rgb, 255)
    if target_size and target_size != size:
        img = img.resize((target_size, target_size), Image.NEAREST)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)


def resolve_type_guide(item_type: str, sub_type: str = "") -> str:
    """Get the detailed visual guide for the specific item/sub type."""
    # Try sub_type first (e.g. "sword", "pickaxe", "helmet"), then item_type, then default
    key = sub_type.lower() if sub_type else item_type.lower()
    if key in TYPE_GUIDES:
        return TYPE_GUIDES[key]
    if item_type.lower() in TYPE_GUIDES:
        return TYPE_GUIDES[item_type.lower()]
    return DEFAULT_TYPE_GUIDE


async def generate_pixel_art_texture(
    name: str,
    item_type: str,
    color: str,
    output_path: str,
    description: str = "",
    sub_type: str = "",
) -> bool:
    """Generate a pixel art texture using AI. Returns True on success."""
    try:
        desc_line = "Description: %s" % description if description else "Primary color: %s" % color
        type_guide = resolve_type_guide(item_type, sub_type)
        prompt = TEXTURE_PROMPT.format(
            item_type="%s (%s)" % (item_type, sub_type) if sub_type else item_type,
            name=name,
            description_line=desc_line,
            type_guide=type_guide,
        )

        response = await groq_client.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=8192,
            json_mode=True,
        )

        data = json.loads(response)
        pixels = data.get("pixels", [])

        if len(pixels) < 16:
            logger.warning("AI texture for %s: got %d rows, expected 16" % (name, len(pixels)))
            return False

        render_pixel_grid(pixels, output_path)
        logger.info("Generated AI texture for %s" % name)
        return True

    except Exception as e:
        logger.warning("AI texture generation failed for %s: %s" % (name, e))
        return False


async def generate_ai_pack_icon(mod_name: str, contents_desc: str, output_path: str) -> bool:
    """Generate an AI pack icon (16x16 scaled to 64x64). Returns True on success."""
    try:
        pack_icon_guide = """MINECRAFT PACK ICON GUIDE:
This is a mod pack icon — it should be eye-catching and recognizable at small sizes.
- Fill the entire 16x16 grid (NO transparent pixels — every pixel should have a color)
- Use a bold, centered design: the most iconic item/symbol from the mod
- Add a colored background or gradient behind the main element
- Use high contrast so it reads well at 64x64 display size
- Consider a simple border (1-2px darker edge) to frame the icon
- Make it colorful and appealing — this is the first thing players see"""
        prompt = TEXTURE_PROMPT.format(
            item_type="mod icon",
            name=mod_name,
            description_line="This is a pack icon for a mod containing: %s" % contents_desc,
            type_guide=pack_icon_guide,
        )

        response = await groq_client.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_tokens=8192,
            json_mode=True,
        )

        data = json.loads(response)
        pixels = data.get("pixels", [])

        if len(pixels) < 16:
            return False

        render_pixel_grid(pixels, output_path, target_size=64)
        logger.info("Generated AI pack icon for %s" % mod_name)
        return True

    except Exception as e:
        logger.warning("AI pack icon generation failed for %s: %s" % (mod_name, e))
        return False


def _save_custom_texture(data_url: str, output_path: str):
    """Save a base64 data URL as a 16x16 PNG file."""
    import base64 as b64mod
    import io as iomod
    from PIL import Image as PILImage

    # Strip data URL prefix
    if "," in data_url:
        data_url = data_url.split(",", 1)[1]
    img_data = b64mod.b64decode(data_url)
    img = PILImage.open(iomod.BytesIO(img_data))
    # Resize to 16x16 with nearest neighbor (pixel art)
    img = img.resize((16, 16), PILImage.NEAREST).convert("RGBA")
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    img.save(output_path)


async def generate_all_textures(spec, build_dir: str, edition: str = "java"):
    """Generate textures — uses custom uploaded texture if provided, otherwise procedural."""
    from services.procedural_textures import (
        generate_procedural_texture, generate_pack_icon_procedural
    )

    if edition == "bedrock":
        rp_dir = os.path.join(build_dir, "resource_pack")

        for item in spec.items:
            tex_path = os.path.join(rp_dir, "textures", "items", "%s.png" % item.registry_name)
            if item.custom_texture:
                _save_custom_texture(item.custom_texture, tex_path)
                logger.info("Using custom texture for %s" % item.display_name)
            else:
                sub = item.weapon_type or item.tool_type or item.armor_slot or ""
                mat = item.material or "iron"
                generate_procedural_texture(item.item_type or "weapon", sub, mat, tex_path)
                logger.info("Generated texture for %s" % item.display_name)

        for block in spec.blocks:
            tex_path = os.path.join(rp_dir, "textures", "blocks", "%s.png" % block.registry_name)
            generate_procedural_texture("block", "", "ore", tex_path)

        # Pack icon — uses the first item's actual shape
        first_item = spec.items[0] if spec.items else None
        primary_mat = first_item.material if first_item else "diamond"
        icon_item_type = first_item.item_type if first_item else "weapon"
        icon_sub_type = (first_item.weapon_type or first_item.tool_type or first_item.armor_slot or "") if first_item else "sword"
        rp_icon = os.path.join(rp_dir, "pack_icon.png")
        bp_icon = os.path.join(build_dir, "behavior_pack", "pack_icon.png")
        generate_pack_icon_procedural(primary_mat, rp_icon, icon_item_type, icon_sub_type)
        os.makedirs(os.path.dirname(bp_icon), exist_ok=True)
        shutil.copy2(rp_icon, bp_icon)

    else:  # java
        assets_base = os.path.join(build_dir, "src", "main", "resources", "assets", spec.mod_id)

        for item in spec.items:
            tex_path = os.path.join(assets_base, "textures", "item", "%s.png" % item.registry_name)
            if item.custom_texture:
                _save_custom_texture(item.custom_texture, tex_path)
            else:
                sub = item.weapon_type or item.tool_type or item.armor_slot or ""
                mat = item.material or "iron"
                generate_procedural_texture(item.item_type or "weapon", sub, mat, tex_path)

        for block in spec.blocks:
            tex_path = os.path.join(assets_base, "textures", "block", "%s.png" % block.registry_name)
            generate_procedural_texture("block", "", "ore", tex_path)
