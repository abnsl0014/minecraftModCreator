import json
import logging
import re
import uuid
from typing import Dict, List

from models import ModSpec
from prompts.bedrock_prompt import (
    BEDROCK_ITEM_SYSTEM_PROMPT,
    BEDROCK_BLOCK_SYSTEM_PROMPT,
    BEDROCK_ENTITY_SYSTEM_PROMPT,
)
from utils.groq_client import groq_client
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)


def generate_uuids(count: int) -> List[str]:
    return [str(uuid.uuid4()) for _ in range(count)]


def generate_manifest_bp(spec: ModSpec, bp_uuid: str, bp_module_uuid: str, rp_uuid: str) -> dict:
    return {
        "format_version": 2,
        "header": {
            "description": spec.mod_description,
            "name": spec.mod_name + " Behavior Pack",
            "uuid": bp_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 0]
        },
        "modules": [
            {
                "description": spec.mod_description,
                "type": "data",
                "uuid": bp_module_uuid,
                "version": [1, 0, 0]
            }
        ],
        "dependencies": [
            {
                "uuid": rp_uuid,
                "version": [1, 0, 0]
            }
        ]
    }


def generate_manifest_rp(spec: ModSpec, rp_uuid: str, rp_module_uuid: str) -> dict:
    return {
        "format_version": 2,
        "header": {
            "description": spec.mod_description,
            "name": spec.mod_name + " Resource Pack",
            "uuid": rp_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 0]
        },
        "modules": [
            {
                "description": spec.mod_description,
                "type": "resources",
                "uuid": rp_module_uuid,
                "version": [1, 0, 0]
            }
        ]
    }


async def generate_bedrock_items(spec: ModSpec) -> Dict[str, str]:
    if not spec.items:
        return {}

    items_desc = "\n".join(
        "- %s (%s): type=%s" % (item.registry_name, item.display_name, item.item_type)
        for item in spec.items
    )

    response = await groq_client.chat(
        messages=[
            {"role": "system", "content": BEDROCK_ITEM_SYSTEM_PROMPT},
            {"role": "user", "content": "Generate Bedrock item JSONs for namespace \"%s\":\n%s\n\nOutput a JSON array." % (spec.mod_id, items_desc)},
        ],
        json_mode=True,
        temperature=0.3,
        max_tokens=4096,
    )

    files = {}
    try:
        data = json.loads(response)
        items_list = data if isinstance(data, list) else data.get("items", [data])
        for i, item_json in enumerate(items_list):
            name = spec.items[i].registry_name if i < len(spec.items) else "item_%d" % i
            files["behavior_pack/items/%s.json" % name] = json.dumps(item_json, indent=2)
    except json.JSONDecodeError:
        # Try to extract individual JSON objects
        text = strip_code_fences(response)
        for i, item in enumerate(spec.items):
            files["behavior_pack/items/%s.json" % item.registry_name] = text

    return files


async def generate_bedrock_blocks(spec: ModSpec) -> Dict[str, str]:
    if not spec.blocks:
        return {}

    blocks_desc = "\n".join(
        "- %s (%s): hardness=%s, resistance=%s" % (b.registry_name, b.display_name, b.hardness, b.resistance)
        for b in spec.blocks
    )

    response = await groq_client.chat(
        messages=[
            {"role": "system", "content": BEDROCK_BLOCK_SYSTEM_PROMPT},
            {"role": "user", "content": "Generate Bedrock block JSONs for namespace \"%s\":\n%s\n\nOutput a JSON array." % (spec.mod_id, blocks_desc)},
        ],
        json_mode=True,
        temperature=0.3,
        max_tokens=4096,
    )

    files = {}
    try:
        data = json.loads(response)
        blocks_list = data if isinstance(data, list) else data.get("blocks", [data])
        for i, block_json in enumerate(blocks_list):
            name = spec.blocks[i].registry_name if i < len(spec.blocks) else "block_%d" % i
            files["behavior_pack/blocks/%s.json" % name] = json.dumps(block_json, indent=2)
    except json.JSONDecodeError:
        text = strip_code_fences(response)
        for i, block in enumerate(spec.blocks):
            files["behavior_pack/blocks/%s.json" % block.registry_name] = text

    return files


async def generate_bedrock_entities(spec: ModSpec) -> Dict[str, str]:
    if not spec.mobs:
        return {}

    mobs_desc = "\n".join(
        "- %s (%s): category=%s, health=%s, speed=%s, damage=%s, behaviors=%s" % (
            m.registry_name, m.display_name, m.mob_category,
            m.health, m.speed, m.damage, m.behaviors
        )
        for m in spec.mobs
    )

    response = await groq_client.chat(
        messages=[
            {"role": "system", "content": BEDROCK_ENTITY_SYSTEM_PROMPT},
            {"role": "user", "content": "Generate Bedrock entity JSONs for namespace \"%s\":\n%s" % (spec.mod_id, mobs_desc)},
        ],
        temperature=0.3,
        max_tokens=8192,
    )

    files = {}
    text = strip_code_fences(response)

    # Split by entity (look for // === RESOURCE === markers)
    parts = re.split(r'//\s*===\s*RESOURCE\s*===', text)

    if len(parts) >= 2:
        # Single entity: parts[0] = behavior, parts[1] = resource
        bp_json = strip_code_fences(parts[0])
        rp_json = strip_code_fences(parts[1])
        name = spec.mobs[0].registry_name
        files["behavior_pack/entities/%s.json" % name] = bp_json
        files["resource_pack/entity/%s.entity.json" % name] = rp_json
    else:
        # Try to parse as single JSON
        files["behavior_pack/entities/%s.json" % spec.mobs[0].registry_name] = text

    return files


def fix_bedrock_item_json(data: dict, namespace: str) -> dict:
    """Fix common issues in generated Bedrock item JSON."""
    if "minecraft:item" not in data:
        return data
    item = data["minecraft:item"]
    desc = item.get("description", {})
    components = item.get("components", {})

    # Fix: category -> menu_category
    if "category" in desc and "menu_category" not in desc:
        cat = desc.pop("category").lower()
        desc["menu_category"] = {"category": cat}

    # Ensure menu_category exists
    if "menu_category" not in desc:
        desc["menu_category"] = {"category": "items"}

    # Remove invalid components
    for bad_key in ["minecraft:damage", "minecraft:hand_equipped", "minecraft:enchantable"]:
        components.pop(bad_key, None)

    item["description"] = desc
    item["components"] = components
    return data


def fix_bedrock_block_json(data: dict, namespace: str, block_name: str) -> dict:
    """Fix common issues in generated Bedrock block JSON."""
    if "minecraft:block" not in data:
        return data
    block = data["minecraft:block"]
    desc = block.get("description", {})
    components = block.get("components", {})

    # Ensure menu_category
    if "menu_category" not in desc:
        desc["menu_category"] = {"category": "construction"}

    # Ensure material_instances for textures
    if "minecraft:material_instances" not in components:
        tex_key = "%s_%s" % (namespace, block_name)
        components["minecraft:material_instances"] = {
            "*": {"texture": tex_key, "render_method": "opaque"}
        }

    block["description"] = desc
    block["components"] = components
    return data


async def generate_all_bedrock_code(spec: ModSpec) -> Dict[str, str]:
    all_files = {}

    # Generate UUIDs for manifests
    uuids = generate_uuids(4)
    bp_uuid, bp_module_uuid, rp_uuid, rp_module_uuid = uuids

    # Manifests
    all_files["behavior_pack/manifest.json"] = json.dumps(
        generate_manifest_bp(spec, bp_uuid, bp_module_uuid, rp_uuid), indent=2
    )
    all_files["resource_pack/manifest.json"] = json.dumps(
        generate_manifest_rp(spec, rp_uuid, rp_module_uuid), indent=2
    )

    # Items
    if spec.items:
        item_files = await generate_bedrock_items(spec)
        # Post-process: fix common item issues
        for path, content in item_files.items():
            try:
                data = json.loads(content)
                data = fix_bedrock_item_json(data, spec.mod_id)
                item_files[path] = json.dumps(data, indent=2)
            except json.JSONDecodeError:
                pass
        all_files.update(item_files)

    # Blocks
    if spec.blocks:
        block_files = await generate_bedrock_blocks(spec)
        # Post-process: fix common block issues
        for path, content in block_files.items():
            try:
                data = json.loads(content)
                block_name = path.split("/")[-1].replace(".json", "")
                data = fix_bedrock_block_json(data, spec.mod_id, block_name)
                block_files[path] = json.dumps(data, indent=2)
            except json.JSONDecodeError:
                pass
        all_files.update(block_files)

    # Entities
    if spec.mobs:
        entity_files = await generate_bedrock_entities(spec)
        all_files.update(entity_files)

    return all_files
