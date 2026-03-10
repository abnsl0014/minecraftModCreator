from typing import Optional, List

from pydantic import BaseModel


class GenerateRequest(BaseModel):
    description: str
    mod_name: Optional[str] = None
    author_name: str = "ModCreator User"
    edition: str = "java"  # "java" or "bedrock"


class EditRequest(BaseModel):
    edit_description: str


class ItemSpec(BaseModel):
    registry_name: str
    display_name: str
    item_type: str = "basic"  # basic, sword, food, tool
    properties: dict = {}
    color: str = "#888888"


class BlockSpec(BaseModel):
    registry_name: str
    display_name: str
    hardness: float = 2.0
    resistance: float = 6.0
    properties: dict = {}
    color: str = "#888888"


class MobSpec(BaseModel):
    registry_name: str
    display_name: str
    mob_category: str = "CREATURE"
    health: float = 20.0
    speed: float = 0.25
    damage: float = 2.0
    behaviors: List[str] = ["random_stroll", "look_at_player"]
    base_mob_model: str = "zombie"
    color: str = "#888888"


class ModSpec(BaseModel):
    mod_id: str
    mod_name: str
    mod_description: str
    author_name: str = "ModCreator User"
    items: List[ItemSpec] = []
    blocks: List[BlockSpec] = []
    mobs: List[MobSpec] = []


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
