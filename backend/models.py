from typing import Optional, List

from pydantic import BaseModel, field_validator


class GenerateRequest(BaseModel):
    description: str
    mod_name: Optional[str] = None
    author_name: str = "ModCreator User"
    edition: str = "java"  # "java" or "bedrock"


class EditRequest(BaseModel):
    edit_description: str


class RecipeSpec(BaseModel):
    pattern: List[str] = []  # e.g. ["DDD", " S ", " S "] for 3x3 grid
    key: dict = {}  # e.g. {"D": "minecraft:diamond", "S": "minecraft:stick"}
    result_count: int = 1


class ItemSpec(BaseModel):
    registry_name: str
    display_name: str
    item_type: str = "weapon"  # weapon, tool, armor, food
    # Weapon fields
    weapon_type: Optional[str] = ""
    damage: Optional[float] = 0
    attack_speed: Optional[str] = "normal"
    durability: Optional[int] = 0
    on_hit_effects: Optional[List[str]] = []
    special_ability: Optional[str] = ""
    cooldown: Optional[float] = 0
    # Tool fields
    tool_type: Optional[str] = ""
    mining_speed: Optional[float] = 6.0
    # Armor fields
    armor_slot: Optional[str] = ""
    defense: Optional[int] = 0
    toughness: Optional[float] = 0
    knockback_resistance: Optional[float] = 0
    armor_effects: Optional[List[str]] = []
    # Food fields
    nutrition: Optional[int] = 0
    saturation: Optional[float] = 0.6
    food_effects: Optional[List[str]] = []
    always_edible: Optional[bool] = False
    fast_eat: Optional[bool] = False
    stack_size: Optional[int] = 64
    # Common
    properties: Optional[dict] = {}
    color: str = "#888888"  # kept for backward compat
    material: Optional[str] = "iron"  # diamond, iron, gold, netherite, emerald, ruby, etc.
    recipe: Optional[RecipeSpec] = None

    @field_validator("*", mode="before")
    @classmethod
    def replace_none_with_default(cls, v, info):
        if v is None:
            defaults = {
                "weapon_type": "", "damage": 0, "attack_speed": "normal",
                "durability": 0, "on_hit_effects": [], "special_ability": "",
                "cooldown": 0, "tool_type": "", "mining_speed": 6.0,
                "armor_slot": "", "defense": 0, "toughness": 0,
                "knockback_resistance": 0, "armor_effects": [],
                "nutrition": 0, "saturation": 0.6, "food_effects": [],
                "always_edible": False, "fast_eat": False, "stack_size": 64,
                "properties": {}, "material": "iron",
            }
            return defaults.get(info.field_name, v)
        return v


class BlockSpec(BaseModel):
    registry_name: str
    display_name: str
    hardness_level: Optional[str] = "stone"
    hardness: Optional[float] = 2.0
    resistance: Optional[float] = 6.0
    luminance: Optional[int] = 0
    tool_requirement: Optional[str] = ""
    transparent: Optional[bool] = False
    drops: Optional[str] = "self"
    properties: Optional[dict] = {}
    color: str = "#888888"

    @field_validator("*", mode="before")
    @classmethod
    def replace_none_with_default(cls, v, info):
        if v is None:
            defaults = {
                "hardness_level": "stone", "hardness": 2.0, "resistance": 6.0,
                "luminance": 0, "tool_requirement": "", "transparent": False,
                "drops": "self", "properties": {},
            }
            return defaults.get(info.field_name, v)
        return v


class ModSpec(BaseModel):
    mod_id: str
    mod_name: str
    mod_description: str
    author_name: str = "ModCreator User"
    items: List[ItemSpec] = []
    blocks: List[BlockSpec] = []


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress_message: str
    iteration: int = 0
    max_iterations: int = 3
    download_ready: bool = False
    jar_url: Optional[str] = None
    error: Optional[str] = None
    edition: str = "java"
    can_edit: bool = False
    mod_id: Optional[str] = None
