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

    # Recipes — auto-generate for EVERY item so they work in survival
    for item in spec.items:
        if item.recipe and item.recipe.pattern:
            pattern = item.recipe.pattern
            key = {k: {"item": v} for k, v in item.recipe.key.items()}
        else:
            # Auto-generate recipe based on item type + material
            pattern, key = _auto_recipe(item)

        recipe = {
            "format_version": "1.20.10",
            "minecraft:recipe_shaped": {
                "description": {"identifier": "%s:%s_recipe" % (spec.mod_id, item.registry_name)},
                "tags": ["crafting_table"],
                "pattern": pattern,
                "key": key,
                "unlock": [{"context": "PlayerInWater"}],
                "result": {"item": "%s:%s" % (spec.mod_id, item.registry_name), "count": 1}
            }
        }
        recipe_path = os.path.join(bp_dir, "recipes", "%s.json" % item.registry_name)
        os.makedirs(os.path.dirname(recipe_path), exist_ok=True)
        with open(recipe_path, 'w') as f:
            json.dump(recipe, f, indent=2)

    # Generate loot tables for blocks (drop themselves when mined)
    for block in spec.blocks:
        loot = {
            "pools": [{
                "rolls": 1,
                "entries": [{
                    "type": "item",
                    "name": "%s:%s" % (spec.mod_id, block.registry_name),
                    "weight": 1
                }]
            }]
        }
        loot_path = os.path.join(bp_dir, "loot_tables", "blocks", "%s.json" % block.registry_name)
        os.makedirs(os.path.dirname(loot_path), exist_ok=True)
        with open(loot_path, 'w') as f:
            json.dump(loot, f, indent=2)

    # Generate armor attachables + textures so armor shows on player model
    _generate_armor_attachables(spec, rp_dir)

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


# === AUTO RECIPE GENERATION ===
# Maps material name to Minecraft crafting ingredient
_MATERIAL_INGREDIENTS = {
    "wood": "minecraft:oak_planks", "stone": "minecraft:cobblestone",
    "iron": "minecraft:iron_ingot", "gold": "minecraft:gold_ingot",
    "diamond": "minecraft:diamond", "netherite": "minecraft:netherite_ingot",
    "emerald": "minecraft:emerald", "ruby": "minecraft:redstone_block",
    "amethyst": "minecraft:amethyst_shard", "obsidian": "minecraft:obsidian",
    "copper": "minecraft:copper_ingot", "redstone": "minecraft:redstone",
    "lapis": "minecraft:lapis_lazuli",
}

# Crafting patterns for each item type (M=material, S=stick, L=leather)
_RECIPE_PATTERNS = {
    # Weapons
    "sword":  (["M", "M", "S"], {"M": None, "S": {"item": "minecraft:stick"}}),
    "katana": (["M", "M", "S"], {"M": None, "S": {"item": "minecraft:stick"}}),
    "spear":  (["M", " ", " "], ["S", " ", " "], ["S", " ", " "], {"M": None, "S": {"item": "minecraft:stick"}}),
    "staff":  (["M", " ", " "], ["S", " ", " "], ["S", " ", " "], {"M": None, "S": {"item": "minecraft:stick"}}),
    "hammer": (["MMM", " S ", " S "], {"M": None, "S": {"item": "minecraft:stick"}}),
    "axe":    (["MM", "MS", " S"], {"M": None, "S": {"item": "minecraft:stick"}}),
    "bow":    ([" MS", "S M", " MS"], {"M": None, "S": {"item": "minecraft:string"}}),
    "gun":    (["M M", "MMM", " S "], {"M": None, "S": {"item": "minecraft:redstone"}}),
    "rpg":    (["MMM", "MRM", " S "], {"M": None, "R": {"item": "minecraft:tnt"}, "S": {"item": "minecraft:stick"}}),
    "crossbow": (["SMS", "STS", " S "], {"M": None, "S": {"item": "minecraft:stick"}, "T": {"item": "minecraft:string"}}),
    # Tools
    "pickaxe": (["MMM", " S ", " S "], {"M": None, "S": {"item": "minecraft:stick"}}),
    "shovel":  ([" M ", " S ", " S "], {"M": None, "S": {"item": "minecraft:stick"}}),
    "hoe":     (["MM ", " S ", " S "], {"M": None, "S": {"item": "minecraft:stick"}}),
    # Armor
    "helmet":     (["MMM", "M M", "   "], {"M": None}),
    "chestplate": (["M M", "MMM", "MMM"], {"M": None}),
    "leggings":   (["MMM", "M M", "M M"], {"M": None}),
    "boots":      (["   ", "M M", "M M"], {"M": None}),
    # Food (surround with gold nuggets)
    "food": (["GGG", "GAG", "GGG"], {"G": {"item": "minecraft:gold_nugget"}, "A": {"item": "minecraft:apple"}}),
}


def _auto_recipe(item):
    """Generate a default crafting recipe based on item type and material."""
    mat = (item.material or "iron").lower()
    ingredient = _MATERIAL_INGREDIENTS.get(mat, "minecraft:iron_ingot")

    # Determine recipe key
    sub = item.weapon_type or item.tool_type or item.armor_slot or ""
    key = sub.lower() if sub else item.item_type

    if key in _RECIPE_PATTERNS:
        data = _RECIPE_PATTERNS[key]
        # Patterns can be (pattern, keys) or (row1, row2, row3, keys)
        if isinstance(data[-1], dict):
            keys_template = data[-1]
            pattern = list(data[:-1])
            # Flatten if nested
            if len(pattern) == 1 and isinstance(pattern[0], list):
                pattern = pattern[0]
        else:
            pattern = ["MMM", " S ", " S "]
            keys_template = {"M": None, "S": {"item": "minecraft:stick"}}
    else:
        # Default: 3 material on top, 2 sticks
        pattern = ["MMM", " S ", " S "]
        keys_template = {"M": None, "S": {"item": "minecraft:stick"}}

    # Replace None with actual ingredient
    final_keys = {}
    for k, v in keys_template.items():
        if v is None:
            final_keys[k] = {"item": ingredient}
        else:
            final_keys[k] = v

    return pattern, final_keys


# Armor slot → geometry, script, enchantable slot mappings
_ARMOR_SLOTS = {
    "helmet": {
        "geometry": "geometry.player.armor.helmet",
        "script": "v.helmet_layer_visible = 0.0;",
    },
    "chestplate": {
        "geometry": "geometry.player.armor.chestplate",
        "script": "v.chest_layer_visible = 0.0;",
    },
    "leggings": {
        "geometry": "geometry.player.armor.leggings",
        "script": "v.leg_layer_visible = 0.0;",
    },
    "boots": {
        "geometry": "geometry.player.armor.boots",
        "script": "v.boot_layer_visible = 0.0;",
    },
}

# Material palette for armor textures
_ARMOR_COLORS = {
    "diamond": (74, 237, 217), "iron": (216, 216, 216), "gold": (252, 219, 92),
    "netherite": (68, 51, 51), "emerald": (23, 221, 98), "ruby": (200, 30, 30),
    "amethyst": (160, 80, 200), "obsidian": (20, 18, 30), "copper": (196, 116, 72),
    "redstone": (180, 20, 20), "lapis": (30, 50, 180),
}


def _generate_armor_attachables(spec, rp_dir):
    """Generate attachable JSON + armor texture for each armor item so it renders on player."""
    from PIL import Image as PILImage

    for item in spec.items:
        if item.item_type != "armor" or not item.armor_slot:
            continue

        slot = item.armor_slot
        if slot not in _ARMOR_SLOTS:
            continue

        slot_info = _ARMOR_SLOTS[slot]
        identifier = "%s:%s" % (spec.mod_id, item.registry_name)
        tex_name = "%s_%s_armor" % (spec.mod_id, item.registry_name)

        # 1. Attachable JSON
        attachable = {
            "format_version": "1.10.0",
            "minecraft:attachable": {
                "description": {
                    "identifier": identifier,
                    "materials": {
                        "default": "armor",
                        "enchanted": "armor_enchanted"
                    },
                    "textures": {
                        "default": "textures/models/armor/%s" % tex_name,
                        "enchanted": "textures/misc/enchanted_actor_glint"
                    },
                    "geometry": {
                        "default": slot_info["geometry"]
                    },
                    "scripts": {
                        "parent_setup": slot_info["script"]
                    },
                    "render_controllers": ["controller.render.armor"]
                }
            }
        }

        attach_dir = os.path.join(rp_dir, "attachables")
        os.makedirs(attach_dir, exist_ok=True)
        with open(os.path.join(attach_dir, "%s.json" % item.registry_name), 'w') as f:
            json.dump(attachable, f, indent=2)

        # 2. Armor texture (64x32 UV map — standard Minecraft armor layout)
        mat = (item.material or "iron").lower()
        base_color = _ARMOR_COLORS.get(mat, (180, 180, 180))
        light = tuple(min(255, int(c * 1.3)) for c in base_color)
        dark = tuple(max(0, int(c * 0.6)) for c in base_color)

        # Create 64x32 armor texture with colored regions
        armor_tex = PILImage.new('RGBA', (64, 32), (0, 0, 0, 0))
        px = armor_tex.load()

        # Fill armor regions based on standard UV layout
        # Helmet: (0,0)-(32,16) area
        # Chestplate: body (16,16)-(40,32), arms (40,16)-(56,32)
        # Leggings: (0,16)-(16,32) and (16,16)-(32,32)
        # Boots: (0,16)-(16,32)
        # For simplicity, fill all regions with the armor color + shading
        for y in range(32):
            for x in range(64):
                # Create a pattern: base color with lighter top, darker bottom
                if y < 8:
                    px[x, y] = (*light, 255)
                elif y < 24:
                    px[x, y] = (*base_color, 255)
                else:
                    px[x, y] = (*dark, 255)

        # Add some detail lines
        for x in range(64):
            px[x, 8] = (*dark, 255)
            px[x, 16] = (*light, 255)
            px[x, 24] = (*dark, 255)

        tex_dir = os.path.join(rp_dir, "textures", "models", "armor")
        os.makedirs(tex_dir, exist_ok=True)
        armor_tex.save(os.path.join(tex_dir, "%s.png" % tex_name))
