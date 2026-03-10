PARSE_SYSTEM_PROMPT = """You analyze Minecraft mod descriptions and extract structured specifications.

You must output valid JSON with this exact schema:
{
  "mod_id": "lowercase_snake_case_id",
  "mod_name": "Display Name",
  "mod_description": "A brief description of what the mod does",
  "items": [
    {
      "registry_name": "snake_case_name",
      "display_name": "Display Name",
      "item_type": "basic|sword|food|tool",
      "properties": {},
      "color": "#hex_color"
    }
  ],
  "blocks": [
    {
      "registry_name": "snake_case_name",
      "display_name": "Display Name",
      "hardness": 2.0,
      "resistance": 6.0,
      "properties": {},
      "color": "#hex_color"
    }
  ],
  "mobs": [
    {
      "registry_name": "snake_case_name",
      "display_name": "Display Name",
      "mob_category": "MONSTER|CREATURE|AMBIENT",
      "health": 20.0,
      "speed": 0.25,
      "damage": 2.0,
      "behaviors": ["melee_attack", "random_stroll", "look_at_player", "follow_player", "float"],
      "base_mob_model": "zombie|pig|cow|chicken|spider|skeleton",
      "color": "#hex_color"
    }
  ]
}

Rules:
- mod_id must be lowercase, alphanumeric + underscores only, max 32 chars
- registry_name must be snake_case
- Choose contextually appropriate colors (red for fire items, green for nature, etc.)
- item_type "sword" gets attack damage/speed properties. "food" gets nutrition/saturation. "basic" is a simple item.
- If the user doesn't specify types, infer reasonable ones from context
- Create 1-5 items/blocks/mobs based on the description complexity
- For mobs, base_mob_model should be the most visually similar existing Minecraft mob
- Keep it simple - don't add more than what the user described"""

PARSE_USER_TEMPLATE = """Analyze this Minecraft mod description and extract the specifications:

Description: {description}
{mod_name_line}

Output the JSON specification."""
