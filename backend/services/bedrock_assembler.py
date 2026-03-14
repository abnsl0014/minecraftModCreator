import json
import os
import zipfile
from typing import Dict

from models import ModSpec
from services.texture_generator import generate_texture, generate_pack_icon
from utils.file_utils import create_build_dir


def assemble_bedrock_addon(job_id: str, spec: ModSpec, generated_files: Dict[str, str]) -> str:
    """Assemble a Bedrock .mcaddon file from generated JSON files."""
    build_dir = create_build_dir(job_id)

    bp_dir = os.path.join(build_dir, "behavior_pack")
    rp_dir = os.path.join(build_dir, "resource_pack")

    # Write all generated files (manifests, item/block JSONs)
    for rel_path, content in generated_files.items():
        full_path = os.path.join(build_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)

    # Pack icons (fallback if AI didn't generate)
    for pack_dir in [bp_dir, rp_dir]:
        icon_path = os.path.join(pack_dir, "pack_icon.png")
        if not os.path.exists(icon_path):
            primary_color = "#4CAF50"
            if spec.items:
                primary_color = spec.items[0].color
            elif spec.blocks:
                primary_color = spec.blocks[0].color
            generate_pack_icon(icon_path, primary_color)

    # item_texture.json - maps SHORT NAMES (no namespace) to texture paths
    # This is the official Bedrock format per Microsoft docs
    if spec.items:
        texture_data = {}
        for item in spec.items:
            # Key matches minecraft:icon textures.default value
            short_name = item.registry_name  # e.g. "lightning_sword"
            texture_data[short_name] = {
                "textures": "textures/items/%s" % item.registry_name
            }
        item_texture = {
            "resource_pack_name": spec.mod_name,
            "texture_data": texture_data
        }
        item_tex_path = os.path.join(rp_dir, "textures", "item_texture.json")
        os.makedirs(os.path.dirname(item_tex_path), exist_ok=True)
        with open(item_tex_path, 'w') as f:
            json.dump(item_texture, f, indent=2)

        # Fallback textures
        for item in spec.items:
            tex_path = os.path.join(rp_dir, "textures", "items", "%s.png" % item.registry_name)
            if not os.path.exists(tex_path):
                generate_texture(item.color, tex_path)

    # terrain_texture.json + blocks.json
    if spec.blocks:
        terrain_data = {}
        blocks_json = {}
        for block in spec.blocks:
            tex_key = "%s_%s" % (spec.mod_id, block.registry_name)
            terrain_data[tex_key] = {
                "textures": "textures/blocks/%s" % block.registry_name
            }
            blocks_json["%s:%s" % (spec.mod_id, block.registry_name)] = {
                "sound": "stone",
                "textures": tex_key
            }

        terrain_tex_path = os.path.join(rp_dir, "textures", "terrain_texture.json")
        os.makedirs(os.path.dirname(terrain_tex_path), exist_ok=True)
        with open(terrain_tex_path, 'w') as f:
            json.dump({"resource_pack_name": spec.mod_name, "texture_name": "atlas.terrain",
                       "padding": 8, "num_mip_levels": 4, "texture_data": terrain_data}, f, indent=2)

        with open(os.path.join(rp_dir, "blocks.json"), 'w') as f:
            json.dump(blocks_json, f, indent=2)

        for block in spec.blocks:
            tex_path = os.path.join(rp_dir, "textures", "blocks", "%s.png" % block.registry_name)
            if not os.path.exists(tex_path):
                generate_texture(block.color, tex_path)

    # Language files
    lang_lines = []
    for item in spec.items:
        lang_lines.append("item.%s:%s.name=%s" % (spec.mod_id, item.registry_name, item.display_name))
    for block in spec.blocks:
        lang_lines.append("tile.%s:%s.name=%s" % (spec.mod_id, block.registry_name, block.display_name))
    for pack_dir in [bp_dir, rp_dir]:
        texts_dir = os.path.join(pack_dir, "texts")
        os.makedirs(texts_dir, exist_ok=True)
        with open(os.path.join(texts_dir, "en_US.lang"), 'w') as f:
            f.write("\n".join(lang_lines))
        with open(os.path.join(texts_dir, "languages.json"), 'w') as f:
            json.dump(["en_US"], f)

    # Recipes
    for item in spec.items:
        if item.recipe and item.recipe.pattern:
            recipe = {
                "format_version": "1.20.10",
                "minecraft:recipe_shaped": {
                    "description": {"identifier": "%s:%s" % (spec.mod_id, item.registry_name)},
                    "tags": ["crafting_table"],
                    "pattern": item.recipe.pattern,
                    "key": {k: {"item": v} for k, v in item.recipe.key.items()},
                    "unlock": [{"context": "PlayerInWater"}],
                    "result": {"item": "%s:%s" % (spec.mod_id, item.registry_name), "count": item.recipe.result_count}
                }
            }
            recipe_path = os.path.join(bp_dir, "recipes", "%s.json" % item.registry_name)
            os.makedirs(os.path.dirname(recipe_path), exist_ok=True)
            with open(recipe_path, 'w') as f:
                json.dump(recipe, f, indent=2)

    # Create .mcaddon — two folders directly in the zip
    mcaddon_path = os.path.join(build_dir, "%s.mcaddon" % spec.mod_id)
    with zipfile.ZipFile(mcaddon_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for pack_name in ["behavior_pack", "resource_pack"]:
            pack_path = os.path.join(build_dir, pack_name)
            for root, dirs, files in os.walk(pack_path):
                for file in files:
                    fp = os.path.join(root, file)
                    arcname = os.path.relpath(fp, build_dir)
                    zf.write(fp, arcname)

    return mcaddon_path
