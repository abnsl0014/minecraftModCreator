import os
import tempfile
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from services.skin_generator import generate_skin, skin_to_base64
from services.model_router import GROQ_MODEL
from utils.auth import get_current_user

router = APIRouter(prefix="/api/skins", tags=["skins"])


class SkinRequest(BaseModel):
    description: str
    model: str = GROQ_MODEL


class SkinResponse(BaseModel):
    skin_id: str
    texture: str  # base64 data URL
    description: str


@router.post("/generate", response_model=SkinResponse)
async def generate_player_skin(req: SkinRequest, user=Depends(get_current_user)):
    """Generate a Minecraft player skin from a text description."""
    skin_id = str(uuid.uuid4())[:8]
    skin_dir = os.path.join(tempfile.gettempdir(), "modcrafter_skins")
    skin_path = os.path.join(skin_dir, "%s.png" % skin_id)

    result = await generate_skin(
        description=req.description,
        output_path=skin_path,
        model_preference=req.model,
    )

    if not result:
        # Return a placeholder on failure
        return SkinResponse(
            skin_id=skin_id,
            texture="",
            description=req.description,
        )

    texture_b64 = skin_to_base64(skin_path)
    return SkinResponse(
        skin_id=skin_id,
        texture=texture_b64 or "",
        description=req.description,
    )
