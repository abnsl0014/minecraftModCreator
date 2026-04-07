"""FastAPI dependency for Supabase auth validation."""
import logging

from fastapi import Depends, HTTPException, Header
from typing import Optional
from supabase import create_client
from config import settings

logger = logging.getLogger(__name__)

# Create a separate client for auth validation (uses service role key)
_auth_client = create_client(settings.supabase_url, settings.supabase_key)


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Validate Supabase auth token via Supabase's auth.getUser() API.
    Returns user_id (UUID string) or None if no auth header.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]

    try:
        user_response = _auth_client.auth.get_user(token)
        if user_response and user_response.user:
            return user_response.user.id
        raise HTTPException(status_code=401, detail="Invalid token")
    except HTTPException:
        raise
    except Exception as e:
        logger.warning("Auth validation failed: %s", e)
        raise HTTPException(status_code=401, detail="Authentication failed")


async def require_auth(user_id: Optional[str] = Depends(get_current_user)) -> str:
    """Dependency that requires authentication. Use on protected routes."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
