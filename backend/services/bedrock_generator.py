import json
import logging
import re
import uuid
from typing import Dict, List

from models import ModSpec
from prompts.bedrock_prompt import (
    BEDROCK_ITEM_SYSTEM_PROMPT,
    BEDROCK_BLOCK_SYSTEM_PROMPT,
)
from utils.groq_client import groq_client
from services.code_generator import strip_code_fences

logger = logging.getLogger(__name__)


def generate_deterministic_uuid(mod_id: str, salt: str) -> str:
    """Generate a consistent UUID from mod_id + salt so reimporting overwrites old packs."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, "modcreator.%s.%s" % (mod_id, salt)))


def build_detailed_description(spec: ModSpec) -> str:
    """Build a rich description listing all items, stats, and features."""
    parts = [spec.mod_description]

    for item in spec.items:
        if item.item_type == "weapon":
            wtype = item.weapon_type or "weapon"
            line = "\n%s - %s %s" % (item.display_name, item.material or "custom", wtype)
            if item.damage: line += ", %g damage" % item.damage
            if item.durability: line += ", %d durability" % item.durability
            if item.attack_speed and item.attack_speed != "normal": line += ", %s speed" % item.attack_speed
            if item.on_hit_effects: line += ". Effects: %s" % ", ".join(item.on_hit_effects)
            if item.special_ability: line += ". Special: %s" % item.special_ability
            parts.append(line)

        elif item.item_type == "tool":
            ttype = item.tool_type or "tool"
            line = "\n%s - %s %s" % (item.display_name, item.material or "custom", ttype)
            if item.durability: line += ", %d durability" % item.durability
            parts.append(line)

        elif item.item_type == "armor":
            slot = item.armor_slot or "armor"
            line = "\n%s - %s %s" % (item.display_name, item.material or "custom", slot)
            if item.defense: line += ", %d defense" % item.defense
            if item.toughness: line += ", %g toughness" % item.toughness
            if item.durability: line += ", %d durability" % item.durability
            if item.armor_effects: line += ". Effects: %s" % ", ".join(item.armor_effects)
            parts.append(line)

        elif item.item_type == "food":
            line = "\n%s - food" % item.display_name
            if item.nutrition: line += ", restores %d hunger" % item.nutrition
            if item.food_effects: line += ". Effects: %s" % ", ".join(item.food_effects)
            if item.always_edible: line += " (always edible)"
            parts.append(line)

    for block in spec.blocks:
        line = "\n%s - block" % block.display_name
        if block.luminance: line += ", light level %d" % block.luminance
        parts.append(line)

    parts.append("\nCreated with ModCreator")
    return "".join(parts)


def _has_on_hit_effects(spec: ModSpec) -> bool:
    """Check if any weapon has on_hit_effects that need scripting."""
    for item in spec.items:
        if item.on_hit_effects:
            return True
    return False


def generate_manifest_bp(spec: ModSpec, bp_uuid: str, bp_module_uuid: str, rp_uuid: str) -> dict:
    desc = build_detailed_description(spec)
    needs_scripts = _has_on_hit_effects(spec)
    script_uuid = generate_deterministic_uuid(spec.mod_id, "bp_script")

    modules = [
        {
            "description": desc,
            "type": "data",
            "uuid": bp_module_uuid,
            "version": [1, 0, 0]
        }
    ]

    dependencies = [
        {
            "uuid": rp_uuid,
            "version": [1, 0, 0]
        }
    ]

    if needs_scripts:
        modules.append({
            "type": "script",
            "language": "javascript",
            "uuid": script_uuid,
            "entry": "scripts/main.js",
            "version": [1, 0, 0]
        })
        dependencies.append({
            "module_name": "@minecraft/server",
            "version": "1.14.0"
        })

    return {
        "format_version": 2,
        "header": {
            "description": desc,
            "name": spec.mod_name,
            "uuid": bp_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 0]
        },
        "modules": modules,
        "dependencies": dependencies
    }


def generate_manifest_rp(spec: ModSpec, rp_uuid: str, rp_module_uuid: str) -> dict:
    return {
        "format_version": 2,
        "header": {
            "description": "Resource pack for " + spec.mod_name,
            "name": spec.mod_name + " Resources",
            "uuid": rp_uuid,
            "version": [1, 0, 0],
            "min_engine_version": [1, 20, 0]
        },
        "modules": [
            {
                "description": "Textures and visuals for " + spec.mod_name,
                "type": "resources",
                "uuid": rp_module_uuid,
                "version": [1, 0, 0]
            }
        ]
    }


async def generate_bedrock_items(spec: ModSpec) -> Dict[str, str]:
    if not spec.items:
        return {}

    def describe_item(item):
        parts = ["- %s (%s): type=%s" % (item.registry_name, item.display_name, item.item_type)]
        if item.item_type == "weapon":
            parts.append("weapon_type=%s, damage=%s, durability=%s" % (item.weapon_type, item.damage, item.durability))
            if item.on_hit_effects:
                parts.append("effects=%s" % item.on_hit_effects)
        elif item.item_type == "tool":
            parts.append("tool_type=%s, durability=%s" % (item.tool_type, item.durability))
        elif item.item_type == "armor":
            slot_map = {"helmet": "slot.armor.head", "chestplate": "slot.armor.chest",
                        "leggings": "slot.armor.legs", "boots": "slot.armor.feet"}
            parts.append("slot=%s, defense=%s, durability=%s" % (
                slot_map.get(item.armor_slot, "slot.armor.chest"), item.defense, item.durability))
        elif item.item_type == "food":
            parts.append("nutrition=%s, saturation=%s" % (item.nutrition, item.saturation))
            if item.always_edible:
                parts.append("can_always_eat=true")
        return ", ".join(parts)

    items_desc = "\n".join(describe_item(item) for item in spec.items)

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
        # Handle various LLM output formats
        if isinstance(data, list):
            items_list = data
        elif isinstance(data, dict) and "items" in data:
            items_list = data["items"]
        elif isinstance(data, dict) and "minecraft:item" in data:
            # Single item or array inside minecraft:item
            mi = data["minecraft:item"]
            if isinstance(mi, list):
                # LLM put all items as array inside one minecraft:item — split them
                items_list = []
                for item_def in mi:
                    items_list.append({
                        "format_version": data.get("format_version", "1.21.40"),
                        "minecraft:item": item_def
                    })
            else:
                items_list = [data]
        else:
            items_list = [data]

        for i, item_json in enumerate(items_list):
            name = spec.items[i].registry_name if i < len(spec.items) else "item_%d" % i
            # Ensure each item has the proper wrapper structure
            if "minecraft:item" not in item_json and "description" in item_json:
                item_json = {
                    "format_version": "1.21.40",
                    "minecraft:item": item_json
                }
            files["behavior_pack/items/%s.json" % name] = json.dumps(item_json, indent=2)
    except json.JSONDecodeError:
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
        if isinstance(data, list):
            blocks_list = data
        elif isinstance(data, dict) and "blocks" in data:
            blocks_list = data["blocks"]
        elif isinstance(data, dict) and "minecraft:block" in data:
            mb = data["minecraft:block"]
            if isinstance(mb, list):
                blocks_list = [{"format_version": data.get("format_version", "1.20.80"), "minecraft:block": b} for b in mb]
            else:
                blocks_list = [data]
        else:
            blocks_list = [data]
        for i, block_json in enumerate(blocks_list):
            name = spec.blocks[i].registry_name if i < len(spec.blocks) else "block_%d" % i
            if "minecraft:block" not in block_json and "description" in block_json:
                block_json = {"format_version": "1.20.80", "minecraft:block": block_json}
            files["behavior_pack/blocks/%s.json" % name] = json.dumps(block_json, indent=2)
    except json.JSONDecodeError:
        text = strip_code_fences(response)
        for i, block in enumerate(spec.blocks):
            files["behavior_pack/blocks/%s.json" % block.registry_name] = text

    return files


INVALID_ITEM_COMPONENTS = [
    "minecraft:attack", "minecraft:mining_speed", "minecraft:armor",
    "minecraft:knockback_resistance", "minecraft:creative_category",
    "minecraft:render_offsets", "minecraft:use_duration",
    "minecraft:stacked_by_data", "minecraft:foil", "minecraft:block_placer",
    "minecraft:entity_placer", "minecraft:on_use", "minecraft:on_use_on",
]


def fix_bedrock_item_json(data: dict, namespace: str) -> dict:
    """Fix common issues in generated Bedrock item JSON."""
    if "minecraft:item" not in data:
        return data

    # Use 1.20.80 for widest compatibility
    data["format_version"] = "1.20.80"

    item = data["minecraft:item"]
    if not isinstance(item, dict):
        return data
    desc = item.get("description", {})
    components = item.get("components", {})

    # Fix: category -> menu_category
    if "category" in desc and "menu_category" not in desc:
        cat = desc.pop("category").lower()
        desc["menu_category"] = {"category": cat}

    if "menu_category" not in desc:
        desc["menu_category"] = {"category": "items"}

    # Strip invalid components
    for bad_key in INVALID_ITEM_COMPONENTS:
        components.pop(bad_key, None)

    # Fix minecraft:icon — use {"textures":{"default":"short_name"}} format (Mojang official)
    identifier = desc.get("identifier", "%s:item" % namespace)
    item_name = identifier.split(":")[-1] if ":" in identifier else identifier

    components["minecraft:icon"] = {"textures": {"default": item_name}}

    # Fix minecraft:damage — use {"value": N} object format
    dmg = components.get("minecraft:damage")
    if dmg is not None:
        if isinstance(dmg, (int, float)):
            components["minecraft:damage"] = {"value": int(dmg)}
        elif isinstance(dmg, dict) and "value" not in dmg:
            components["minecraft:damage"] = {"value": int(dmg.get("damage", 5))}

    # Ensure display_name
    if "minecraft:display_name" not in components:
        components["minecraft:display_name"] = {"value": item_name.replace("_", " ").title()}

    # Ensure stack size
    if "minecraft:max_stack_size" not in components:
        has_food = "minecraft:food" in components
        components["minecraft:max_stack_size"] = 64 if has_food else 1

    item["description"] = desc
    item["components"] = components
    return data


def inject_food_effects(item_json: dict, food_effects: list) -> dict:
    """Add potion effects to food items based on spec."""
    if not food_effects:
        return item_json
    mi = item_json.get("minecraft:item", {})
    if not isinstance(mi, dict):
        return item_json
    comps = mi.get("components", {})
    food = comps.get("minecraft:food")
    if not food or not isinstance(food, dict):
        return item_json

    # Build effects array per official Bedrock format
    effects = []
    for eff_name in food_effects:
        effects.append({
            "name": eff_name,
            "chance": 1.0,
            "duration": 30,
            "amplifier": 1
        })
    if effects:
        food["effects"] = effects
        food["can_always_eat"] = True
        if "saturation_modifier" not in food or food["saturation_modifier"] == 0.6:
            food["saturation_modifier"] = "supernatural"

    return item_json


def fix_bedrock_block_json(data: dict, namespace: str, block_name: str) -> dict:
    """Fix common issues in generated Bedrock block JSON."""
    if "minecraft:block" not in data:
        return data
    data["format_version"] = "1.20.80"
    block = data["minecraft:block"]
    if not isinstance(block, dict):
        return data
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


def generate_hit_effects_script(spec: ModSpec) -> str:
    """Generate JavaScript for on-hit weapon effects using @minecraft/server API."""
    lines = [
        'import { world, system } from "@minecraft/server";',
        '',
        '// On-hit effects for custom weapons',
        'world.afterEvents.entityHitEntity.subscribe((event) => {',
        '  const attacker = event.damagingEntity;',
        '  const target = event.hitEntity;',
        '  if (!attacker?.typeId === "minecraft:player") return;',
        '',
        '  try {',
        '    const equipment = attacker.getComponent("minecraft:equippable");',
        '    if (!equipment) return;',
        '    const mainhand = equipment.getEquipment("Mainhand");',
        '    if (!mainhand) return;',
        '    const itemId = mainhand.typeId;',
        '',
    ]

    for item in spec.items:
        if not item.on_hit_effects:
            continue
        item_id = "%s:%s" % (spec.mod_id, item.registry_name)
        lines.append('    if (itemId === "%s") {' % item_id)

        for effect in item.on_hit_effects:
            if effect == "lightning":
                lines.append('      // Summon lightning at target')
                lines.append('      const loc = target.location;')
                lines.append('      target.dimension.spawnEntity("minecraft:lightning_bolt", loc);')
            elif effect == "fire":
                lines.append('      // Set target on fire')
                lines.append('      target.setOnFire(5, true);')
            elif effect == "poison":
                lines.append('      // Apply poison effect')
                lines.append('      target.addEffect("minecraft:poison", 100, { amplifier: 1 });')
            elif effect == "wither":
                lines.append('      target.addEffect("minecraft:wither", 100, { amplifier: 1 });')
            elif effect == "slowness":
                lines.append('      target.addEffect("minecraft:slowness", 100, { amplifier: 2 });')
            elif effect == "freeze":
                lines.append('      // Freeze target — extreme slowness + mining fatigue + ice particles')
                lines.append('      target.addEffect("minecraft:slowness", 200, { amplifier: 4 });')
                lines.append('      target.addEffect("minecraft:mining_fatigue", 200, { amplifier: 3 });')
                lines.append('      target.addEffect("minecraft:weakness", 200, { amplifier: 1 });')
                lines.append('      // Spawn snow particles around target')
                lines.append('      const fl = target.location;')
                lines.append('      target.dimension.spawnParticle("minecraft:basic_smoke_particle", {x:fl.x, y:fl.y+1, z:fl.z});')
                lines.append('      target.dimension.spawnParticle("minecraft:basic_smoke_particle", {x:fl.x+0.5, y:fl.y+0.5, z:fl.z+0.5});')
                lines.append('      target.dimension.spawnParticle("minecraft:basic_smoke_particle", {x:fl.x-0.5, y:fl.y+1.5, z:fl.z-0.5});')
            elif effect == "lifesteal":
                lines.append('      // Heal attacker (lifesteal)')
                lines.append('      const health = attacker.getComponent("minecraft:health");')
                lines.append('      if (health) { health.setCurrentValue(Math.min(health.currentValue + 4, health.effectiveMax)); }')
            elif effect == "knockback":
                lines.append('      // Extra knockback')
                lines.append('      const dir = target.location;')
                lines.append('      const aLoc = attacker.location;')
                lines.append('      const dx = dir.x - aLoc.x; const dz = dir.z - aLoc.z;')
                lines.append('      const len = Math.sqrt(dx*dx + dz*dz) || 1;')
                lines.append('      target.applyKnockback(dx/len, dz/len, 3, 0.4);')

        lines.append('    }')
        lines.append('')

    lines.append('  } catch (e) {}')
    lines.append('});')
    lines.append('')

    return '\n'.join(lines)


async def generate_all_bedrock_code(spec: ModSpec) -> Dict[str, str]:
    all_files = {}

    # Generate UUIDs for manifests
    bp_uuid = generate_deterministic_uuid(spec.mod_id, "bp_header")
    bp_module_uuid = generate_deterministic_uuid(spec.mod_id, "bp_module")
    rp_uuid = generate_deterministic_uuid(spec.mod_id, "rp_header")
    rp_module_uuid = generate_deterministic_uuid(spec.mod_id, "rp_module")

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
        # Post-process: fix common item issues + inject effects
        for path, content in item_files.items():
            try:
                data = json.loads(content)
                data = fix_bedrock_item_json(data, spec.mod_id)
                # Find matching spec item to inject food effects
                item_name = path.split("/")[-1].replace(".json", "")
                for s_item in spec.items:
                    if s_item.registry_name == item_name and s_item.food_effects:
                        data = inject_food_effects(data, s_item.food_effects)
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

    # Scripts for on-hit effects (lightning, fire, poison, etc.)
    if _has_on_hit_effects(spec):
        script = generate_hit_effects_script(spec)
        all_files["behavior_pack/scripts/main.js"] = script

    return all_files
