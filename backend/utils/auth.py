"""FastAPI dependency for Supabase JWT validation."""
import jwt
from fastapi import Depends, HTTPException, Header
from typing import Optional
from config import settings


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract and validate Supabase JWT from Authorization header.
    Returns user_id (UUID string) or None if no auth header.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_auth(user_id: Optional[str] = Depends(get_current_user)) -> str:
    """Dependency that requires authentication. Use on protected routes."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
