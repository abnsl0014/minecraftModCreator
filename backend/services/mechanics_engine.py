"""Mechanics Engine — reasons about how each item should WORK in Minecraft
and enriches the spec with the correct implementation details.

This runs AFTER parsing (Step 1) and BEFORE code generation (Step 2).
It doesn't use any LLM — pure rule-based logic.
"""
import logging

logger = logging.getLogger(__name__)


# Keywords → on-hit effects
EFFECT_KEYWORDS = {
    "fire": ["fire"], "flame": ["fire"], "burn": ["fire"], "inferno": ["fire"], "blaze": ["fire"],
    "ice": ["freeze"], "frost": ["freeze"], "frozen": ["freeze"], "cryo": ["freeze"], "cold": ["freeze"],
    "lightning": ["lightning"], "thunder": ["lightning"], "electric": ["lightning"], "shock": ["lightning"], "storm": ["lightning"],
    "poison": ["poison"], "toxic": ["poison"], "venom": ["poison"],
    "wither": ["wither"], "decay": ["wither"], "death": ["wither"], "necrotic": ["wither"],
    "explosive": ["explosion"], "blast": ["explosion"], "boom": ["explosion"], "detonate": ["explosion"],
    "knockback": ["knockback"], "push": ["knockback"], "yeet": ["knockback"],
    "lifesteal": ["lifesteal"], "vampire": ["lifesteal"], "drain": ["lifesteal"], "heal on hit": ["lifesteal"],
    "blind": ["blindness"], "dark": ["blindness"],
    "levitate": ["levitation"], "launch": ["levitation"], "float": ["levitation"], "gravity": ["levitation"],
    "teleport": ["teleport"], "warp": ["teleport"], "blink": ["teleport"],
}

# Weapon type → default behavior
WEAPON_DEFAULTS = {
    "sword":    {"damage_range": (7, 20), "speed": "normal", "melee": True},
    "katana":   {"damage_range": (8, 25), "speed": "fast", "melee": True},
    "hammer":   {"damage_range": (12, 30), "speed": "slow", "melee": True},
    "axe":      {"damage_range": (9, 25), "speed": "slow", "melee": True},
    "spear":    {"damage_range": (6, 15), "speed": "normal", "melee": True},
    "staff":    {"damage_range": (5, 18), "speed": "fast", "melee": True},
    "gauntlet": {"damage_range": (8, 20), "speed": "fast", "melee": True},
    "whip":     {"damage_range": (5, 12), "speed": "fast", "melee": True},
    "shield":   {"damage_range": (3, 8),  "speed": "slow", "melee": True},
    "bow":      {"damage_range": (5, 12), "speed": "normal", "ranged": "shooter"},
    "crossbow": {"damage_range": (10, 15), "speed": "slow", "ranged": "shooter"},
    "gun":      {"damage_range": (8, 20), "speed": "fast", "ranged": "shooter"},
    "rpg":      {"damage_range": (15, 40), "speed": "slow", "ranged": "throwable"},
    "throwable":{"damage_range": (5, 15), "speed": "fast", "ranged": "throwable"},
    "nuke":     {"damage_range": (50, 200), "speed": "slow", "ranged": "throwable"},
}


def analyze_and_enrich(spec) -> str:
    """Analyze each item's mechanics and enrich the spec. Returns a summary."""
    analysis_lines = []

    for item in spec.items:
        name_lower = item.display_name.lower()
        desc_lower = (item.display_name + " " + str(item.on_hit_effects)).lower()

        if item.item_type == "weapon":
            wtype = item.weapon_type or "sword"

            # 1. Infer effects from item NAME if none specified
            if not item.on_hit_effects:
                inferred = []
                for keyword, effects in EFFECT_KEYWORDS.items():
                    if keyword in name_lower:
                        inferred.extend(effects)
                if inferred:
                    item.on_hit_effects = list(set(inferred))
                    analysis_lines.append("%s: inferred effects %s from name" % (item.display_name, item.on_hit_effects))

            # 2. Set default damage if 0
            if not item.damage or item.damage <= 0:
                defaults = WEAPON_DEFAULTS.get(wtype, WEAPON_DEFAULTS["sword"])
                item.damage = defaults["damage_range"][0]
                analysis_lines.append("%s: set default damage %d for %s" % (item.display_name, item.damage, wtype))

            # 3. Set default durability if 0
            if not item.durability or item.durability <= 0:
                item.durability = 500
                analysis_lines.append("%s: set default durability 500" % item.display_name)

            # 4. Auto-add explosion for nukes/rpg
            if wtype in ("nuke", "rpg") and "explosion" not in (item.on_hit_effects or []):
                item.on_hit_effects = (item.on_hit_effects or []) + ["explosion"]
                analysis_lines.append("%s: auto-added explosion for %s" % (item.display_name, wtype))

            # 5. Ensure high damage for nukes
            if wtype == "nuke" and item.damage < 50:
                item.damage = max(item.damage, 50)
                analysis_lines.append("%s: boosted nuke damage to %d" % (item.display_name, item.damage))

            # 6. Auto glowing for magical/legendary weapons
            if wtype in ("staff",) and not item.glowing:
                item.glowing = True
                analysis_lines.append("%s: auto-glow for staff" % item.display_name)

            # 6b. Auto-infer special_ability from name if not set
            if not item.special_ability:
                nl = item.display_name.lower()
                if any(k in nl for k in ["fire", "flame", "blaze", "inferno"]):
                    item.special_ability = "Shoots a fireball"
                    analysis_lines.append("%s: inferred ability=fireball from name" % item.display_name)
                elif any(k in nl for k in ["frost", "ice", "freeze", "cryo", "blizzard"]):
                    item.special_ability = "Freezes all nearby enemies"
                    analysis_lines.append("%s: inferred ability=freeze_aura from name" % item.display_name)
                elif any(k in nl for k in ["lightning", "thunder", "storm", "zeus"]):
                    item.special_ability = "Summons lightning forward"
                    analysis_lines.append("%s: inferred ability=lightning from name" % item.display_name)
                elif any(k in nl for k in ["shadow", "void", "dark", "phantom", "blink"]):
                    item.special_ability = "Teleports forward"
                    analysis_lines.append("%s: inferred ability=teleport from name" % item.display_name)
                elif any(k in nl for k in ["explosive", "nuke", "bomb", "cannon"]):
                    item.special_ability = "Creates a massive explosion"
                    analysis_lines.append("%s: inferred ability=explosion from name" % item.display_name)
                elif any(k in nl for k in ["heal", "life", "holy", "divine", "angel"]):
                    item.special_ability = "Heals the wielder"
                    analysis_lines.append("%s: inferred ability=heal from name" % item.display_name)

            # 6c. Auto-set visual properties from keywords
            nl = item.display_name.lower()
            if any(k in nl for k in ["legendary", "mythic", "divine", "god", "ultimate", "supreme"]) and not item.rarity:
                item.rarity = "epic"
                item.glowing = True
                item.fire_resistant = True
                analysis_lines.append("%s: auto legendary → epic+glow+fireproof" % item.display_name)
            elif any(k in nl for k in ["epic", "rare", "enchanted", "magic"]) and not item.rarity:
                item.rarity = "rare"
                item.glowing = True
                analysis_lines.append("%s: auto rare → rare+glow" % item.display_name)

            # 7. If weapon_type is unknown, map to closest known type
            if wtype not in WEAPON_DEFAULTS:
                name_l = item.display_name.lower()
                if any(k in name_l for k in ["gun", "rifle", "pistol", "cannon", "laser", "blaster"]): item.weapon_type = "gun"
                elif any(k in name_l for k in ["rocket", "rpg", "launcher", "bazooka"]): item.weapon_type = "rpg"
                elif any(k in name_l for k in ["bow", "crossbow"]): item.weapon_type = "bow"
                elif any(k in name_l for k in ["bomb", "grenade", "mine", "shuriken", "ball"]): item.weapon_type = "throwable"
                elif any(k in name_l for k in ["hammer", "mace", "club"]): item.weapon_type = "hammer"
                elif any(k in name_l for k in ["staff", "wand", "rod", "orb"]): item.weapon_type = "staff"
                elif any(k in name_l for k in ["fist", "gauntlet", "claw", "knuckle"]): item.weapon_type = "gauntlet"
                else: item.weapon_type = "sword"  # default fallback
                analysis_lines.append("%s: unknown type '%s' → mapped to %s" % (item.display_name, wtype, item.weapon_type))
                wtype = item.weapon_type

            defaults = WEAPON_DEFAULTS.get(wtype, {})
            if "ranged" in defaults:
                analysis_lines.append("%s: ranged weapon (%s) → will add %s component" % (item.display_name, wtype, defaults["ranged"]))

        elif item.item_type == "armor":
            # 1. Set default defense if 0
            if not item.defense or item.defense <= 0:
                slot_defaults = {"helmet": 3, "chestplate": 8, "leggings": 6, "boots": 3}
                item.defense = slot_defaults.get(item.armor_slot, 5)
                analysis_lines.append("%s: set default defense %d for %s" % (item.display_name, item.defense, item.armor_slot))

            # 2. Set default durability
            if not item.durability or item.durability <= 0:
                item.durability = 500
                analysis_lines.append("%s: set default durability 500" % item.display_name)

            # 3. Infer effects from name
            if not item.armor_effects:
                inferred = []
                if any(k in name_lower for k in ["speed", "swift", "quick", "fast"]): inferred.append("speed")
                if any(k in name_lower for k in ["night", "dark", "shadow", "void"]): inferred.append("night_vision")
                if any(k in name_lower for k in ["regen", "heal", "life", "vitality"]): inferred.append("regeneration")
                if any(k in name_lower for k in ["fire", "flame", "lava", "magma"]): inferred.append("fire_resistance")
                if any(k in name_lower for k in ["jump", "leap", "bounce", "spring"]): inferred.append("jump_boost")
                if any(k in name_lower for k in ["strong", "power", "might", "titan"]): inferred.append("strength")
                if any(k in name_lower for k in ["water", "ocean", "aqua", "sea"]): inferred.append("water_breathing")
                if any(k in name_lower for k in ["tank", "fortress", "iron", "resist"]): inferred.append("resistance")
                if inferred:
                    item.armor_effects = inferred
                    analysis_lines.append("%s: inferred armor effects %s from name" % (item.display_name, inferred))

        elif item.item_type == "food":
            # 1. Set default nutrition if 0
            if not item.nutrition or item.nutrition <= 0:
                item.nutrition = 6
                analysis_lines.append("%s: set default nutrition 6" % item.display_name)

            # 2. Infer effects from name
            if not item.food_effects:
                inferred = []
                if any(k in name_lower for k in ["heal", "health", "regen", "life"]): inferred.extend(["regeneration", "instant_health"])
                if any(k in name_lower for k in ["god", "divine", "legendary", "ultimate"]): inferred.extend(["regeneration", "absorption", "resistance", "speed", "strength"])
                if any(k in name_lower for k in ["speed", "swift", "quick"]): inferred.append("speed")
                if any(k in name_lower for k in ["strength", "power", "might"]): inferred.append("strength")
                if any(k in name_lower for k in ["golden", "enchanted"]): inferred.extend(["regeneration", "absorption"])
                if inferred:
                    item.food_effects = list(set(inferred))
                    analysis_lines.append("%s: inferred food effects %s from name" % (item.display_name, item.food_effects))

        elif item.item_type == "tool":
            # Default durability
            if not item.durability or item.durability <= 0:
                item.durability = 1000
                analysis_lines.append("%s: set default durability 1000" % item.display_name)

    # Handle special gadgets/devices — map to closest working Minecraft item
    for item in spec.items:
        nl = item.display_name.lower()

        # Jetpack → armor chestplate with jump_boost + slow_falling
        if any(k in nl for k in ["jetpack", "jet pack", "wings", "elytra"]) and item.item_type != "armor":
            item.item_type = "armor"
            item.armor_slot = "chestplate"
            item.defense = 4
            item.durability = item.durability or 1000
            item.armor_effects = list(set((item.armor_effects or []) + ["jump_boost", "slow_falling"]))
            analysis_lines.append("%s: jetpack → chestplate with jump_boost+slow_falling" % item.display_name)

        # Grappling hook → throwable with teleport effect
        elif any(k in nl for k in ["grappling", "grapple", "hook"]) and item.item_type == "weapon":
            item.weapon_type = "throwable"
            item.on_hit_effects = list(set((item.on_hit_effects or []) + ["teleport"]))
            item.special_ability = item.special_ability or "Teleports to target location"
            analysis_lines.append("%s: grapple → throwable with teleport" % item.display_name)

        # Time stopper → staff with freeze AoE
        elif any(k in nl for k in ["time stop", "time freeze", "chronos", "time"]) and item.item_type == "weapon":
            item.weapon_type = "staff"
            item.special_ability = item.special_ability or "Freezes all nearby enemies"
            item.on_hit_effects = list(set((item.on_hit_effects or []) + ["freeze"]))
            item.glowing = True
            analysis_lines.append("%s: time stopper → staff with freeze AoE" % item.display_name)

        # Gravity gun → staff with levitation
        elif any(k in nl for k in ["gravity", "levitation gun", "tractor"]) and item.item_type == "weapon":
            item.weapon_type = "staff"
            item.on_hit_effects = list(set((item.on_hit_effects or []) + ["levitation", "knockback"]))
            item.special_ability = item.special_ability or "Launches enemies into the air"
            analysis_lines.append("%s: gravity gun → staff with levitation" % item.display_name)

        # Shrink ray → gun with weakness + slowness
        elif any(k in nl for k in ["shrink", "ray gun", "laser"]) and item.item_type == "weapon":
            item.weapon_type = "gun"
            item.on_hit_effects = list(set((item.on_hit_effects or []) + ["slowness", "blindness"]))
            analysis_lines.append("%s: shrink/ray → gun with slowness+blindness" % item.display_name)

        # Pet summoner → staff that spawns entities (special ability)
        elif any(k in nl for k in ["summon", "spawn", "pet"]) and item.item_type == "weapon":
            item.weapon_type = "staff"
            item.special_ability = item.special_ability or "Summons allies to fight for you"
            item.glowing = True
            analysis_lines.append("%s: summoner → staff with summon ability" % item.display_name)

        # Lucky block → convert to block with luminance
        elif any(k in nl for k in ["lucky", "fortune block", "mystery"]):
            # Keep as whatever type the LLM assigned
            if item.item_type != "food":
                item.glowing = True
                item.rarity = "rare"
            analysis_lines.append("%s: lucky/mystery item → added glow+rare" % item.display_name)

    # Handle passive/charm items — if user asks for amulet/charm/ring/totem
    # These work as armor helmet slot (easiest way to make passive items in Bedrock)
    for item in spec.items:
        nl = item.display_name.lower()
        if item.item_type not in ("armor", "food") and any(k in nl for k in ["charm", "amulet", "ring", "totem", "pendant", "necklace", "talisman", "relic"]):
            # Convert to food (always edible = use to activate) with effects
            item.item_type = "food"
            item.always_edible = True
            item.nutrition = 1
            if not item.food_effects:
                inferred = []
                if any(k in nl for k in ["speed", "swift"]): inferred.append("speed")
                if any(k in nl for k in ["luck", "fortune"]): inferred.extend(["speed", "haste"])
                if any(k in nl for k in ["strength", "power"]): inferred.append("strength")
                if any(k in nl for k in ["protection", "shield"]): inferred.append("resistance")
                if any(k in nl for k in ["heal", "life", "vitality"]): inferred.append("regeneration")
                if not inferred: inferred = ["speed", "strength"]
                item.food_effects = inferred
            item.glowing = True
            analysis_lines.append("%s: charm/amulet → converted to consumable with effects %s" % (item.display_name, item.food_effects))

    # If user said "big cannon" or "placeable X", also add a handheld version
    for item in list(spec.items):  # copy list since we might add
        nl = item.display_name.lower()
        if any(k in nl for k in ["big ", "placeable ", "mounted "]):
            # This is likely a placeable weapon — user might want BOTH a block and handheld item
            # The block version is handled by the parse prompt putting it in blocks
            # But ensure the handheld version has proper mechanics
            if item.item_type == "weapon" and not item.weapon_type:
                item.weapon_type = "rpg"  # handheld version shoots
            analysis_lines.append("%s: big/placeable weapon → ensuring rpg mechanics" % item.display_name)

    # Also infer material from name if not set properly
    for item in spec.items:
        if not item.material or item.material == "iron":
            name_lower = item.display_name.lower()
            for mat in ["diamond", "netherite", "emerald", "ruby", "gold", "obsidian", "amethyst", "copper", "redstone", "lapis"]:
                if mat in name_lower:
                    item.material = mat
                    analysis_lines.append("%s: inferred material=%s from name" % (item.display_name, mat))
                    break

    summary = "Analyzed %d items: %s" % (len(spec.items), "; ".join(analysis_lines[:5]))
    if len(analysis_lines) > 5:
        summary += " (+%d more)" % (len(analysis_lines) - 5)

    logger.info("Mechanics analysis: %d enrichments" % len(analysis_lines))
    for line in analysis_lines:
        logger.info("  %s" % line)

    return summary
