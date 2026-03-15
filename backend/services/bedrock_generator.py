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


def _needs_scripts(spec: ModSpec) -> bool:
    """Check if any item needs the Script API."""
    for item in spec.items:
        if item.on_hit_effects:
            return True
        if item.item_type == "armor" and item.armor_effects:
            return True
        if item.special_ability:
            return True
    return False


def generate_manifest_bp(spec: ModSpec, bp_uuid: str, bp_module_uuid: str, rp_uuid: str) -> dict:
    desc = build_detailed_description(spec)
    needs_scripts = _needs_scripts(spec)
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

    # Split into batches of 8 to avoid LLM truncation
    BATCH_SIZE = 8
    all_items_desc = [describe_item(item) for item in spec.items]

    files = {}
    for batch_start in range(0, len(spec.items), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(spec.items))
        batch_desc = "\n".join(all_items_desc[batch_start:batch_end])
        batch_items = spec.items[batch_start:batch_end]

        response = await groq_client.chat(
            messages=[
                {"role": "system", "content": BEDROCK_ITEM_SYSTEM_PROMPT},
                {"role": "user", "content": "Generate Bedrock item JSONs for namespace \"%s\":\n%s\n\nOutput a JSON array with exactly %d items." % (spec.mod_id, batch_desc, len(batch_items))},
            ],
            json_mode=True,
            temperature=0.3,
            max_tokens=8192,
        )

        try:
            data = json.loads(response)
            if isinstance(data, list):
                items_list = data
            elif isinstance(data, dict) and "items" in data:
                items_list = data["items"]
            elif isinstance(data, dict) and "minecraft:item" in data:
                mi = data["minecraft:item"]
                if isinstance(mi, list):
                    items_list = [{"format_version": data.get("format_version", "1.20.80"), "minecraft:item": d} for d in mi]
                else:
                    items_list = [data]
            else:
                items_list = [data]

            for i, item_json in enumerate(items_list):
                if i >= len(batch_items):
                    break
                name = batch_items[i].registry_name
                if "minecraft:item" not in item_json and "description" in item_json:
                    item_json = {"format_version": "1.20.80", "minecraft:item": item_json}
                files["behavior_pack/items/%s.json" % name] = json.dumps(item_json, indent=2)
        except json.JSONDecodeError:
            text = strip_code_fences(response)
            for item in batch_items:
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


def inject_weapon_mechanics(item_json: dict, spec_item) -> dict:
    """Auto-add shooter/throwable/projectile components based on weapon_type."""
    if spec_item.item_type != "weapon":
        return item_json
    mi = item_json.get("minecraft:item", {})
    if not isinstance(mi, dict):
        return item_json
    comps = mi.get("components", {})
    wtype = (spec_item.weapon_type or "").lower()

    # Guns — rapid fire shooter (uses arrows as ammo)
    if wtype == "gun" and "minecraft:shooter" not in comps:
        comps["minecraft:shooter"] = {
            "max_draw_duration": 0.1,
            "charge_on_draw": True,
            "scale_power_by_draw_duration": False,
            "ammunition": [
                {"item": "minecraft:arrow", "use_offhand": False, "use_in_creative": True}
            ]
        }
        comps["minecraft:use_modifiers"] = {"use_duration": 0.1}
        comps["minecraft:use_animation"] = "bow"

    # Crossbow — slower shooter
    elif wtype == "crossbow" and "minecraft:shooter" not in comps:
        comps["minecraft:shooter"] = {
            "max_draw_duration": 1.0,
            "charge_on_draw": True,
            "scale_power_by_draw_duration": True,
            "ammunition": [
                {"item": "minecraft:arrow", "use_offhand": False, "use_in_creative": True}
            ]
        }
        comps["minecraft:use_animation"] = "bow"

    # RPG — shoots fireballs
    elif wtype == "rpg":
        if "minecraft:throwable" not in comps:
            comps["minecraft:throwable"] = {
                "do_swing_animation": True,
                "max_draw_duration": 0,
                "scale_power_by_draw_duration": False
            }
        if "minecraft:projectile" not in comps:
            comps["minecraft:projectile"] = {
                "projectile_entity": "minecraft:fireball",
                "minimum_critical_power": 0
            }
        comps["minecraft:use_animation"] = "bow"

    # Throwable — thrown like snowball
    elif wtype == "throwable":
        if "minecraft:throwable" not in comps:
            comps["minecraft:throwable"] = {
                "do_swing_animation": True,
                "max_draw_duration": 0,
                "scale_power_by_draw_duration": False
            }
        if "minecraft:projectile" not in comps:
            comps["minecraft:projectile"] = {
                "projectile_entity": "minecraft:snowball",
                "minimum_critical_power": 0
            }

    # Nuke — throwable that creates explosion
    elif wtype == "nuke":
        if "minecraft:throwable" not in comps:
            comps["minecraft:throwable"] = {
                "do_swing_animation": True,
                "max_draw_duration": 0,
                "scale_power_by_draw_duration": False
            }
        if "minecraft:projectile" not in comps:
            comps["minecraft:projectile"] = {
                "projectile_entity": "minecraft:fireball",
                "minimum_critical_power": 0
            }

    # Bow — standard bow behavior
    elif wtype == "bow" and "minecraft:shooter" not in comps:
        comps["minecraft:shooter"] = {
            "max_draw_duration": 1.0,
            "charge_on_draw": True,
            "scale_power_by_draw_duration": True,
            "ammunition": [
                {"item": "minecraft:arrow", "use_offhand": True, "use_in_creative": True}
            ]
        }
        comps["minecraft:use_animation"] = "bow"

    return item_json


def inject_visual_properties(item_json: dict, spec_item) -> dict:
    """Add glint, rarity, fire_resistant, hover_text_color to item JSON."""
    mi = item_json.get("minecraft:item", {})
    if not isinstance(mi, dict):
        return item_json
    comps = mi.get("components", {})

    # Enchanted glint shimmer
    if spec_item.glowing:
        comps["minecraft:glint"] = True

    # Rarity (changes name color)
    if spec_item.rarity:
        rarity_map = {"common": "common", "uncommon": "uncommon", "rare": "rare",
                      "epic": "epic", "legendary": "epic", "mythic": "epic"}
        mapped = rarity_map.get(spec_item.rarity.lower())
        if mapped:
            comps["minecraft:rarity"] = mapped

    # Fire resistant (survives lava)
    if spec_item.fire_resistant:
        comps["minecraft:fire_resistant"] = True

    # Custom name hover color
    color_map = {
        "red": "red", "blue": "blue", "green": "green", "yellow": "yellow",
        "gold": "gold", "aqua": "aqua", "light_purple": "light_purple",
        "dark_red": "dark_red", "dark_blue": "dark_blue", "white": "white",
    }
    if spec_item.hover_text_color and spec_item.hover_text_color.lower() in color_map:
        comps["minecraft:hover_text_color"] = color_map[spec_item.hover_text_color.lower()]

    return item_json


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
    """Generate advanced JavaScript: on-hit effects, armor passives, set bonuses, combo tracking, cooldowns."""
    lines = [
        'import { world, system } from "@minecraft/server";',
        '',
        '// Cooldown & combo tracking',
        'const cooldowns = new Map();',
        'const combos = new Map();',
        '',
        'function isOnCooldown(playerId, ability) {',
        '  const key = playerId + ":" + ability;',
        '  const last = cooldowns.get(key) || 0;',
        '  return Date.now() - last < 3000; // 3 second cooldown',
        '}',
        'function setCooldown(playerId, ability) {',
        '  cooldowns.set(playerId + ":" + ability, Date.now());',
        '}',
        'function getCombo(playerId) {',
        '  const c = combos.get(playerId) || { count: 0, last: 0 };',
        '  if (Date.now() - c.last > 2000) c.count = 0; // reset after 2s',
        '  return c;',
        '}',
        'function addCombo(playerId) {',
        '  const c = getCombo(playerId);',
        '  c.count = Math.min(c.count + 1, 5);',
        '  c.last = Date.now();',
        '  combos.set(playerId, c);',
        '  return c.count;',
        '}',
        '',
    ]

    # === KILL TRACKER ===
    lines.append('// Kill counter')
    lines.append('const kills = new Map();')
    lines.append('world.afterEvents.entityDie.subscribe((event) => {')
    lines.append('  const killer = event.damageSource?.damagingEntity;')
    lines.append('  if (!killer || killer.typeId !== "minecraft:player") return;')
    lines.append('  const k = (kills.get(killer.id) || 0) + 1;')
    lines.append('  kills.set(killer.id, k);')
    lines.append('  if (k % 5 === 0) killer.runCommand("title @s actionbar §6" + k + " kills! §eKillstreak!");')
    lines.append('  if (k % 10 === 0) {')
    lines.append('    killer.addEffect("minecraft:strength", 200, { amplifier: 1 });')
    lines.append('    killer.addEffect("minecraft:speed", 200, { amplifier: 1 });')
    lines.append('    killer.runCommand("title @s title §c§lRAMPAGE!");')
    lines.append('  }')
    lines.append('});')
    lines.append('')

    # === WEAPON ON-HIT EFFECTS WITH COMBO SCALING ===
    weapon_items = [i for i in spec.items if i.on_hit_effects]
    if weapon_items:
        lines.append('// === WEAPON ON-HIT EFFECTS ===')
        lines.append('world.afterEvents.entityHitEntity.subscribe((event) => {')
        lines.append('  const attacker = event.damagingEntity;')
        lines.append('  const target = event.hitEntity;')
        lines.append('  if (!attacker || attacker.typeId !== "minecraft:player") return;')
        lines.append('  try {')
        lines.append('    const eq = attacker.getComponent("minecraft:equippable");')
        lines.append('    if (!eq) return;')
        lines.append('    const hand = eq.getEquipment("Mainhand");')
        lines.append('    if (!hand) return;')
        lines.append('    const id = hand.typeId;')
        lines.append('    const loc = target.location;')
        lines.append('    const dim = target.dimension;')
        lines.append('    const pid = attacker.id;')
        lines.append('    const combo = addCombo(pid);')
        lines.append('')

        for item in weapon_items:
            item_id = "%s:%s" % (spec.mod_id, item.registry_name)
            lines.append('    if (id === "%s") {' % item_id)
            # Combo damage bonus
            if item.damage and item.damage > 5:
                lines.append('      // Combo bonus: +2 damage per consecutive hit (max 5x)')
                lines.append('      if (combo >= 3) attacker.runCommand("title @s actionbar Combo x" + combo + "!");')

            # Particle map for each effect
            for effect in item.on_hit_effects:
                if effect == "lightning":
                    lines.append('      dim.spawnEntity("minecraft:lightning_bolt", loc);')
                    lines.append('      dim.spawnParticle("minecraft:huge_explosion_emitter", loc);')
                elif effect == "fire":
                    lines.append('      target.setOnFire(5, true);')
                    lines.append('      dim.spawnParticle("minecraft:large_explosion", {x:loc.x, y:loc.y+1, z:loc.z});')
                elif effect == "freeze":
                    lines.append('      target.addEffect("minecraft:slowness", 200, { amplifier: 4 });')
                    lines.append('      target.addEffect("minecraft:mining_fatigue", 200, { amplifier: 3 });')
                    lines.append('      target.addEffect("minecraft:weakness", 200, { amplifier: 1 });')
                    lines.append('      for (let i=0;i<5;i++) dim.spawnParticle("minecraft:basic_smoke_particle", {x:loc.x+(Math.random()-0.5)*2, y:loc.y+Math.random()*2, z:loc.z+(Math.random()-0.5)*2});')
                elif effect == "poison":
                    lines.append('      target.addEffect("minecraft:poison", 200, { amplifier: 1 });')
                    lines.append('      dim.spawnParticle("minecraft:villager_angry", loc);')
                elif effect == "wither":
                    lines.append('      target.addEffect("minecraft:wither", 200, { amplifier: 1 });')
                    lines.append('      dim.spawnParticle("minecraft:large_explosion", loc);')
                elif effect == "slowness":
                    lines.append('      target.addEffect("minecraft:slowness", 200, { amplifier: 2 });')
                    lines.append('      dim.spawnParticle("minecraft:basic_smoke_particle", loc);')
                elif effect == "lifesteal":
                    lines.append('      const hp = attacker.getComponent("minecraft:health");')
                    lines.append('      if (hp) hp.setCurrentValue(Math.min(hp.currentValue+4, hp.effectiveMax));')
                    lines.append('      dim.spawnParticle("minecraft:heart_particle", {x:loc.x, y:loc.y+1.5, z:loc.z});')
                elif effect == "knockback":
                    lines.append('      const aL = attacker.location;')
                    lines.append('      const dx = loc.x-aL.x, dz = loc.z-aL.z;')
                    lines.append('      const len = Math.sqrt(dx*dx+dz*dz)||1;')
                    lines.append('      target.applyKnockback(dx/len, dz/len, 4, 0.5);')
                    lines.append('      dim.spawnParticle("minecraft:huge_explosion_emitter", loc);')
                elif effect == "explosion":
                    lines.append('      dim.createExplosion(loc, 3, { breaksBlocks: true, causesFire: false });')
                    lines.append('      dim.spawnParticle("minecraft:huge_explosion_emitter", loc);')
                elif effect == "blindness":
                    lines.append('      target.addEffect("minecraft:blindness", 100, { amplifier: 0 });')
                    lines.append('      dim.spawnParticle("minecraft:large_explosion", loc);')
                elif effect == "levitation":
                    lines.append('      target.addEffect("minecraft:levitation", 60, { amplifier: 5 });')
                    lines.append('      dim.spawnParticle("minecraft:endrod", {x:loc.x, y:loc.y+1, z:loc.z});')
                elif effect == "teleport":
                    lines.append('      attacker.teleport(loc);')
                    lines.append('      dim.spawnParticle("minecraft:endrod", loc);')
                    lines.append('      dim.spawnParticle("minecraft:endrod", attacker.location);')

            lines.append('    }')

        lines.append('  } catch(e) {}')
        lines.append('});')
        lines.append('')

    # === ARMOR SET BONUSES (if 2+ armor pieces) ===
    armor_items = [i for i in spec.items if i.item_type == "armor" and i.armor_effects]
    if armor_items:
        lines.append('// === ARMOR PASSIVE EFFECTS ===')
        lines.append('system.runInterval(() => {')
        lines.append('  for (const player of world.getAllPlayers()) {')
        lines.append('    try {')
        lines.append('      const eq = player.getComponent("minecraft:equippable");')
        lines.append('      if (!eq) continue;')
        lines.append('      const head = eq.getEquipment("Head");')
        lines.append('      const chest = eq.getEquipment("Chest");')
        lines.append('      const legs = eq.getEquipment("Legs");')
        lines.append('      const feet = eq.getEquipment("Feet");')
        lines.append('      const worn = [head?.typeId, chest?.typeId, legs?.typeId, feet?.typeId];')
        lines.append('')

        for item in armor_items:
            item_id = "%s:%s" % (spec.mod_id, item.registry_name)
            lines.append('      if (worn.includes("%s")) {' % item_id)
            for eff in item.armor_effects:
                effect_name = "minecraft:%s" % eff
                lines.append('        player.addEffect("%s", 260, { amplifier: 0, showParticles: false });' % effect_name)
            lines.append('      }')

        # Set bonus — if ALL armor pieces from this mod are worn
        mod_armor_ids = ['"%s:%s"' % (spec.mod_id, i.registry_name) for i in spec.items if i.item_type == "armor"]
        if len(mod_armor_ids) >= 2:
            lines.append('')
            lines.append('      // Set bonus: wearing %d+ pieces from this mod' % len(mod_armor_ids))
            lines.append('      const modPieces = worn.filter(w => [%s].includes(w)).length;' % ','.join(mod_armor_ids))
            lines.append('      if (modPieces >= %d) {' % len(mod_armor_ids))
            lines.append('        player.addEffect("minecraft:resistance", 260, { amplifier: 1, showParticles: false });')
            lines.append('        player.addEffect("minecraft:regeneration", 260, { amplifier: 0, showParticles: false });')
            lines.append('      }')

        lines.append('    } catch(e) {}')
        lines.append('  }')
        lines.append('}, 200); // Every 10 seconds')
        lines.append('')

    # === RIGHT-CLICK SPECIAL ABILITIES ===
    ability_items = [i for i in spec.items if i.special_ability and i.item_type == "weapon"]
    if ability_items:
        lines.append('// === RIGHT-CLICK SPECIAL ABILITIES ===')
        lines.append('world.afterEvents.itemUse.subscribe((event) => {')
        lines.append('  const player = event.source;')
        lines.append('  if (player.typeId !== "minecraft:player") return;')
        lines.append('  try {')
        lines.append('    const item = event.itemStack;')
        lines.append('    if (!item) return;')
        lines.append('    const id = item.typeId;')
        lines.append('    const dim = player.dimension;')
        lines.append('    const loc = player.location;')
        lines.append('    const dir = player.getViewDirection();')
        lines.append('    const sneaking = player.isSneaking;')
        lines.append('')

        for item in ability_items:
            item_id = "%s:%s" % (spec.mod_id, item.registry_name)
            ability = (item.special_ability or "").lower()
            lines.append('    if (id === "%s") {' % item_id)
            lines.append('      if (isOnCooldown(player.id, "%s")) { player.runCommand("title @s actionbar §cAbility on cooldown!"); return; }' % item.registry_name)
            lines.append('      setCooldown(player.id, "%s");' % item.registry_name)
            lines.append('      player.runCommand("title @s actionbar §a%s activated!");' % (item.special_ability or "Special")[:30])

            if any(k in ability for k in ["fireball", "fire", "shoot fire", "flame"]):
                lines.append('      // Shoot fireball')
                lines.append('      const fb = dim.spawnEntity("minecraft:fireball", {x:loc.x+dir.x*2, y:loc.y+1.5+dir.y*2, z:loc.z+dir.z*2});')
            elif any(k in ability for k in ["lightning", "thunder", "smite"]):
                lines.append('      // Summon lightning forward')
                lines.append('      dim.spawnEntity("minecraft:lightning_bolt", {x:loc.x+dir.x*8, y:loc.y, z:loc.z+dir.z*8});')
            elif any(k in ability for k in ["teleport", "dash", "blink", "warp"]):
                lines.append('      // Teleport forward')
                lines.append('      player.teleport({x:loc.x+dir.x*10, y:loc.y+dir.y*10+1, z:loc.z+dir.z*10});')
                lines.append('      dim.spawnParticle("minecraft:endrod", loc);')
            elif any(k in ability for k in ["heal", "regen", "restore"]):
                lines.append('      // Self heal')
                lines.append('      player.addEffect("minecraft:regeneration", 200, { amplifier: 2 });')
                lines.append('      player.addEffect("minecraft:absorption", 200, { amplifier: 2 });')
            elif any(k in ability for k in ["explode", "nuke", "blast", "boom"]):
                lines.append('      // Forward explosion')
                lines.append('      dim.createExplosion({x:loc.x+dir.x*5, y:loc.y+1, z:loc.z+dir.z*5}, 5, { breaksBlocks: true, causesFire: true });')
            elif any(k in ability for k in ["speed", "sprint", "rush", "charge"]):
                lines.append('      player.addEffect("minecraft:speed", 100, { amplifier: 4 });')
                lines.append('      player.addEffect("minecraft:resistance", 60, { amplifier: 2 });')
            elif any(k in ability for k in ["shield", "protect", "barrier", "block"]):
                lines.append('      player.addEffect("minecraft:resistance", 100, { amplifier: 3 });')
                lines.append('      player.addEffect("minecraft:regeneration", 100, { amplifier: 1 });')
            elif any(k in ability for k in ["freeze", "ice", "frost"]):
                lines.append('      // Freeze all nearby entities')
                lines.append('      const nearby = dim.getEntities({location:loc, maxDistance:8, excludeTypes:["minecraft:player"]});')
                lines.append('      for (const e of nearby) { try { e.addEffect("minecraft:slowness", 200, {amplifier:4}); e.addEffect("minecraft:weakness", 200, {amplifier:2}); } catch(ex){} }')
            else:
                lines.append('      // Generic ability: buff self')
                lines.append('      player.addEffect("minecraft:strength", 200, { amplifier: 2 });')
                lines.append('      player.addEffect("minecraft:speed", 200, { amplifier: 1 });')

            lines.append('      dim.spawnParticle("minecraft:large_explosion", {x:loc.x, y:loc.y+1, z:loc.z});')
            # Sneak alt-ability: AoE version
            lines.append('      if (sneaking) {')
            lines.append('        player.runCommand("title @s actionbar §d%s ULTIMATE!");' % item.display_name[:20])
            lines.append('        // AoE blast around player')
            lines.append('        const entities = dim.getEntities({location:loc, maxDistance:10, excludeTypes:["minecraft:player"]});')
            lines.append('        for (const e of entities) { try {')
            if "fire" in (item.on_hit_effects or []):
                lines.append('          e.setOnFire(8, true);')
            if "freeze" in (item.on_hit_effects or []):
                lines.append('          e.addEffect("minecraft:slowness", 300, {amplifier:4});')
            if "lightning" in (item.on_hit_effects or []):
                lines.append('          dim.spawnEntity("minecraft:lightning_bolt", e.location);')
            if "wither" in (item.on_hit_effects or []):
                lines.append('          e.addEffect("minecraft:wither", 200, {amplifier:2});')
            if not any(x in (item.on_hit_effects or []) for x in ["fire","freeze","lightning","wither"]):
                lines.append('          e.addEffect("minecraft:slowness", 200, {amplifier:3});')
            lines.append('        } catch(ex){} }')
            lines.append('        dim.spawnParticle("minecraft:huge_explosion_emitter", loc);')
            lines.append('      }')
            lines.append('    }')

        lines.append('  } catch(e) {}')
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
                # Find matching spec item to inject effects + visual properties
                item_name = path.split("/")[-1].replace(".json", "")
                for s_item in spec.items:
                    if s_item.registry_name == item_name:
                        if s_item.food_effects:
                            data = inject_food_effects(data, s_item.food_effects)
                        data = inject_weapon_mechanics(data, s_item)
                        data = inject_visual_properties(data, s_item)
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
    if _needs_scripts(spec):
        script = generate_hit_effects_script(spec)
        all_files["behavior_pack/scripts/main.js"] = script

    return all_files
