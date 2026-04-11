from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

MAX_DESCRIPTION_LENGTH = 10000
MAX_TITLE_LENGTH = 200
MAX_NAME_LENGTH = 100
MAX_TEXTURE_BASE64_LENGTH = 500_000  # ~375KB decoded
MAX_CUSTOM_TEXTURES = 20


class CustomTextureItem(BaseModel):
    """Carries custom texture data for a specific item."""
    registry_name: str = Field(max_length=MAX_NAME_LENGTH)
    custom_texture: str = Field(max_length=MAX_TEXTURE_BASE64_LENGTH)


class GenerateRequest(BaseModel):
    description: str = Field(max_length=MAX_DESCRIPTION_LENGTH)
    mod_name: Optional[str] = Field(None, max_length=MAX_NAME_LENGTH)
    author_name: str = Field("ModCreator User", max_length=MAX_NAME_LENGTH)
    model: str = "gpt-oss-120b"  # "gpt-oss-120b" | "sonnet-4.6"
    custom_textures: Optional[List[CustomTextureItem]] = None

    @field_validator("custom_textures")
    @classmethod
    def limit_custom_textures(cls, v):
        if v and len(v) > MAX_CUSTOM_TEXTURES:
            raise ValueError(f"Maximum {MAX_CUSTOM_TEXTURES} custom textures allowed")
        return v


class EditRequest(BaseModel):
    edit_description: str = Field(max_length=MAX_DESCRIPTION_LENGTH)


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
    # Visual / exterior
    glowing: Optional[bool] = False  # enchanted glint shimmer
    rarity: Optional[str] = ""  # common, uncommon, rare, epic
    fire_resistant: Optional[bool] = False  # survives lava/fire when dropped
    hover_text_color: Optional[str] = ""  # custom name color: red, blue, green, yellow, etc.
    # Common
    properties: Optional[dict] = {}
    color: Optional[str] = "#888888"
    material: Optional[str] = "iron"
    custom_texture: Optional[str] = None
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
                "properties": {}, "color": "#888888", "material": "iron", "custom_texture": None,
                "glowing": False, "rarity": "", "fire_resistant": False, "hover_text_color": "",
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
    color: Optional[str] = "#888888"

    @field_validator("*", mode="before")
    @classmethod
    def replace_none_with_default(cls, v, info):
        if v is None:
            defaults = {
                "hardness_level": "stone", "hardness": 2.0, "resistance": 6.0,
                "luminance": 0, "tool_requirement": "", "transparent": False,
                "drops": "self", "properties": {}, "color": "#888888",
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


class TexturePreviewItem(BaseModel):
    name: str
    registry_name: str
    type: str
    texture: str  # base64 data URL


class TexturePreviews(BaseModel):
    items: List[TexturePreviewItem] = []
    blocks: List[TexturePreviewItem] = []


class JobStatus(BaseModel):
    job_id: str
    status: str  # queued, parsing, generating, packaging, complete, failed
    progress_message: str
    download_ready: bool = False
    jar_url: Optional[str] = None
    error: Optional[str] = None
    can_edit: bool = False
    mod_id: Optional[str] = None
    model_used: str = "gpt-oss-120b"
    texture_previews: Optional[TexturePreviews] = None


class SubmissionCreate(BaseModel):
    title: str = Field(max_length=MAX_TITLE_LENGTH)
    description: str = Field(max_length=MAX_DESCRIPTION_LENGTH)
    category: str = "weapon"
    tags: List[str] = Field(default=[], max_length=20)
    video_url: Optional[str] = Field(None, max_length=500)
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    job_id: Optional[str] = None


class SubmissionUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=MAX_TITLE_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    category: Optional[str] = None
    tags: Optional[List[str]] = Field(None, max_length=20)
    video_url: Optional[str] = Field(None, max_length=500)
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)


class SubmissionResponse(BaseModel):
    id: str
    user_id: str
    job_id: Optional[str] = None
    title: str
    description: str
    category: str
    tags: List[str] = []
    screenshots: List[str] = []
    video_url: Optional[str] = None
    download_url: str
    crafting_recipe: Optional[dict] = None
    survival_guide: Optional[str] = None
    status: str
    rejection_reason: Optional[str] = None
    download_count: int = 0
    featured: bool = False
    created_at: str
    updated_at: str
    author_name: Optional[str] = None  # joined from user_profiles.display_name


class AdminRejectRequest(BaseModel):
    reason: str
