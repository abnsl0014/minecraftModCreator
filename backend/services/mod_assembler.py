import json
import os
import shutil
import stat

from config import settings
from models import ModSpec
from services.texture_generator import generate_texture
from utils.file_utils import create_build_dir


def assemble_mod(job_id: str, spec: ModSpec, generated_code: dict[str, str]) -> str:
    build_dir = create_build_dir(job_id)
    template_dir = os.path.abspath(settings.mod_template_dir)

    # 1. Copy static files
    for item in ["build.gradle", "settings.gradle", "gradlew", "gradlew.bat"]:
        src = os.path.join(template_dir, item)
        dst = os.path.join(build_dir, item)
        if os.path.exists(src):
            shutil.copy2(src, dst)

    # Copy gradle wrapper
    wrapper_src = os.path.join(template_dir, "gradle", "wrapper")
    wrapper_dst = os.path.join(build_dir, "gradle", "wrapper")
    os.makedirs(wrapper_dst, exist_ok=True)
    for item in os.listdir(wrapper_src):
        shutil.copy2(os.path.join(wrapper_src, item), os.path.join(wrapper_dst, item))

    # Make gradlew executable
    gradlew_path = os.path.join(build_dir, "gradlew")
    if os.path.exists(gradlew_path):
        st = os.stat(gradlew_path)
        os.chmod(gradlew_path, st.st_mode | stat.S_IEXEC | stat.S_IXGRP | stat.S_IXOTH)

    # 2. Create gradle.properties from template
    template_path = os.path.join(template_dir, "gradle.properties.template")
    with open(template_path, 'r') as f:
        gradle_props = f.read()

    gradle_props = gradle_props.replace("{mod_id}", spec.mod_id)
    gradle_props = gradle_props.replace("{mod_name}", spec.mod_name)
    gradle_props = gradle_props.replace("{mod_authors}", spec.author_name)
    gradle_props = gradle_props.replace("{mod_description}", spec.mod_description.replace("\n", " "))

    with open(os.path.join(build_dir, "gradle.properties"), 'w') as f:
        f.write(gradle_props)

    # 3. Copy mods.toml (uses Gradle variable substitution)
    mods_toml_src = os.path.join(template_dir, "src", "main", "resources", "META-INF", "mods.toml")
    mods_toml_dst_dir = os.path.join(build_dir, "src", "main", "resources", "META-INF")
    os.makedirs(mods_toml_dst_dir, exist_ok=True)
    shutil.copy2(mods_toml_src, os.path.join(mods_toml_dst_dir, "mods.toml"))

    # 4. Write pack.mcmeta
    pack_mcmeta = {
        "pack": {
            "description": "${mod_description}",
            "pack_format": 15
        }
    }
    with open(os.path.join(build_dir, "src", "main", "resources", "pack.mcmeta"), 'w') as f:
        json.dump(pack_mcmeta, f, indent=2)

    # 5. Write generated Java code (with path traversal protection)
    java_base = os.path.join(build_dir, "src", "main", "java", "com", "modcreator", spec.mod_id)
    for rel_path, code in generated_code.items():
        full_path = os.path.normpath(os.path.join(java_base, rel_path))
        if not full_path.startswith(os.path.normpath(java_base)):
            continue  # skip path traversal attempts
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, 'w') as f:
            f.write(code)

    # 6. Generate resource files
    assets_base = os.path.join(build_dir, "src", "main", "resources", "assets", spec.mod_id)

    # Language file
    lang_data = {}
    lang_data[f"itemGroup.{spec.mod_id}"] = spec.mod_name
    for item in spec.items:
        lang_data[f"item.{spec.mod_id}.{item.registry_name}"] = item.display_name
    for block in spec.blocks:
        lang_data[f"block.{spec.mod_id}.{block.registry_name}"] = block.display_name
    lang_dir = os.path.join(assets_base, "lang")
    os.makedirs(lang_dir, exist_ok=True)
    with open(os.path.join(lang_dir, "en_us.json"), 'w') as f:
        json.dump(lang_data, f, indent=2)

    # Item models
    models_item_dir = os.path.join(assets_base, "models", "item")
    os.makedirs(models_item_dir, exist_ok=True)
    for item in spec.items:
        model = {
            "parent": "minecraft:item/generated",
            "textures": {
                "layer0": f"{spec.mod_id}:item/{item.registry_name}"
            }
        }
        with open(os.path.join(models_item_dir, f"{item.registry_name}.json"), 'w') as f:
            json.dump(model, f, indent=2)

    # Block models, blockstates, and block item models
    models_block_dir = os.path.join(assets_base, "models", "block")
    blockstates_dir = os.path.join(assets_base, "blockstates")
    os.makedirs(models_block_dir, exist_ok=True)
    os.makedirs(blockstates_dir, exist_ok=True)

    for block in spec.blocks:
        # Block model
        block_model = {
            "parent": "minecraft:block/cube_all",
            "textures": {
                "all": f"{spec.mod_id}:block/{block.registry_name}"
            }
        }
        with open(os.path.join(models_block_dir, f"{block.registry_name}.json"), 'w') as f:
            json.dump(block_model, f, indent=2)

        # Blockstate
        blockstate = {
            "variants": {
                "": {"model": f"{spec.mod_id}:block/{block.registry_name}"}
            }
        }
        with open(os.path.join(blockstates_dir, f"{block.registry_name}.json"), 'w') as f:
            json.dump(blockstate, f, indent=2)

        # Block item model
        block_item_model = {
            "parent": f"{spec.mod_id}:block/{block.registry_name}"
        }
        with open(os.path.join(models_item_dir, f"{block.registry_name}.json"), 'w') as f:
            json.dump(block_item_model, f, indent=2)

    # 7. Generate textures (solid color fallback - AI textures overwrite these later)
    textures_item_dir = os.path.join(assets_base, "textures", "item")
    textures_block_dir = os.path.join(assets_base, "textures", "block")

    for item in spec.items:
        tex_path = os.path.join(textures_item_dir, f"{item.registry_name}.png")
        if not os.path.exists(tex_path):
            generate_texture(item.color, tex_path)

    for block in spec.blocks:
        tex_path = os.path.join(textures_block_dir, f"{block.registry_name}.png")
        if not os.path.exists(tex_path):
            generate_texture(block.color, tex_path)

    # 8. Generate crafting recipes
    data_dir = os.path.join(build_dir, "src", "main", "resources", "data", spec.mod_id, "recipes")
    os.makedirs(data_dir, exist_ok=True)

    for item in spec.items:
        if item.recipe and item.recipe.pattern:
            recipe_json = {
                "type": "minecraft:crafting_shaped",
                "pattern": item.recipe.pattern,
                "key": {},
                "result": {
                    "item": f"{spec.mod_id}:{item.registry_name}",
                    "count": item.recipe.result_count
                }
            }
            for char, ingredient in item.recipe.key.items():
                recipe_json["key"][char] = {"item": ingredient}
            with open(os.path.join(data_dir, f"{item.registry_name}.json"), 'w') as f:
                json.dump(recipe_json, f, indent=2)

    return build_dir
