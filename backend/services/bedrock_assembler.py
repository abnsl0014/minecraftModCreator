import json
import os
import zipfile
from typing import Dict

from models import ModSpec
from services.texture_generator import generate_texture
from utils.file_utils import create_build_dir


def assemble_bedrock_addon(job_id: str, spec: ModSpec, generated_files: Dict[str, str]) -> str:
    """Assemble a Bedrock .mcaddon file from generated JSON files."""
    build_dir = create_build_dir(job_id)

    bp_dir = os.path.join(build_dir, "behavior_pack")
    rp_dir = os.path.join(build_dir, "resource_pack")

    # Write all generated files
    for rel_path, content in generated_files.items():
        full_path = os.path.join(build_dir, rel_path)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(content)

    # Generate item_texture.json for resource pack
    if spec.items:
        texture_data = {}
        for item in spec.items:
            texture_data["%s:%s" % (spec.mod_id, item.registry_name)] = {
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

        # Generate item textures
        for item in spec.items:
            tex_path = os.path.join(rp_dir, "textures", "items", "%s.png" % item.registry_name)
            generate_texture(item.color, tex_path)

    # Generate terrain_texture.json and blocks.json for resource pack
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

        terrain_texture = {
            "resource_pack_name": spec.mod_name,
            "texture_name": "atlas.terrain",
            "padding": 8,
            "num_mip_levels": 4,
            "texture_data": terrain_data
        }
        terrain_tex_path = os.path.join(rp_dir, "textures", "terrain_texture.json")
        os.makedirs(os.path.dirname(terrain_tex_path), exist_ok=True)
        with open(terrain_tex_path, 'w') as f:
            json.dump(terrain_texture, f, indent=2)

        blocks_json_path = os.path.join(rp_dir, "blocks.json")
        with open(blocks_json_path, 'w') as f:
            json.dump(blocks_json, f, indent=2)

        # Generate block textures
        for block in spec.blocks:
            tex_path = os.path.join(rp_dir, "textures", "blocks", "%s.png" % block.registry_name)
            generate_texture(block.color, tex_path)

    # Generate entity textures (simple colored 64x64)
    if spec.mobs:
        for mob in spec.mobs:
            tex_path = os.path.join(rp_dir, "textures", "entity", "%s.png" % mob.registry_name)
            generate_texture(mob.color, tex_path)

            # Simple geometry file
            geo = {
                "format_version": "1.16.0",
                "minecraft:geometry": [{
                    "description": {
                        "identifier": "geometry.%s" % mob.registry_name,
                        "texture_width": 64,
                        "texture_height": 64,
                        "visible_bounds_width": 1.5,
                        "visible_bounds_height": 2.0,
                        "visible_bounds_offset": [0, 1.0, 0]
                    },
                    "bones": [
                        {
                            "name": "body",
                            "pivot": [0, 8, 0],
                            "cubes": [{"origin": [-4, 4, -3], "size": [8, 8, 6], "uv": [0, 0]}]
                        },
                        {
                            "name": "head",
                            "parent": "body",
                            "pivot": [0, 12, -3],
                            "cubes": [{"origin": [-3, 12, -6], "size": [6, 6, 6], "uv": [0, 14]}]
                        },
                        {
                            "name": "leg0",
                            "parent": "body",
                            "pivot": [-2, 4, 2],
                            "cubes": [{"origin": [-3, 0, 1], "size": [2, 4, 2], "uv": [0, 26]}]
                        },
                        {
                            "name": "leg1",
                            "parent": "body",
                            "pivot": [2, 4, 2],
                            "cubes": [{"origin": [1, 0, 1], "size": [2, 4, 2], "uv": [0, 26]}]
                        },
                        {
                            "name": "leg2",
                            "parent": "body",
                            "pivot": [-2, 4, -2],
                            "cubes": [{"origin": [-3, 0, -3], "size": [2, 4, 2], "uv": [0, 26]}]
                        },
                        {
                            "name": "leg3",
                            "parent": "body",
                            "pivot": [2, 4, -2],
                            "cubes": [{"origin": [1, 0, -3], "size": [2, 4, 2], "uv": [0, 26]}]
                        }
                    ]
                }]
            }
            geo_path = os.path.join(rp_dir, "models", "entity", "%s.geo.json" % mob.registry_name)
            os.makedirs(os.path.dirname(geo_path), exist_ok=True)
            with open(geo_path, 'w') as f:
                json.dump(geo, f, indent=2)

    # Language files
    lang_lines = []
    for item in spec.items:
        lang_lines.append("item.%s:%s.name=%s" % (spec.mod_id, item.registry_name, item.display_name))
    for block in spec.blocks:
        lang_lines.append("tile.%s:%s.name=%s" % (spec.mod_id, block.registry_name, block.display_name))
    for mob in spec.mobs:
        lang_lines.append("entity.%s:%s.name=%s" % (spec.mod_id, mob.registry_name, mob.display_name))
        lang_lines.append("item.spawn_egg.entity.%s:%s.name=Spawn %s" % (spec.mod_id, mob.registry_name, mob.display_name))

    for pack_dir in [bp_dir, rp_dir]:
        texts_dir = os.path.join(pack_dir, "texts")
        os.makedirs(texts_dir, exist_ok=True)
        with open(os.path.join(texts_dir, "en_US.lang"), 'w') as f:
            f.write("\n".join(lang_lines))
        with open(os.path.join(texts_dir, "languages.json"), 'w') as f:
            json.dump(["en_US"], f)

    # Zip into .mcaddon
    mcaddon_path = os.path.join(build_dir, "%s.mcaddon" % spec.mod_id)
    with zipfile.ZipFile(mcaddon_path, 'w', zipfile.ZIP_DEFLATED) as zf:
        for pack_name in ["behavior_pack", "resource_pack"]:
            pack_path = os.path.join(build_dir, pack_name)
            for root, dirs, files in os.walk(pack_path):
                for file in files:
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, build_dir)
                    zf.write(file_path, arcname)

    return mcaddon_path
