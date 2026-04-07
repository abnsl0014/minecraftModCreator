"""User profile and token management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query

from utils.auth import require_auth
from utils.supabase_client import supabase
from services.submission_manager import get_user_public_profile

router = APIRouter(prefix="/api/user")


@router.get("/profile")
async def get_profile(user_id: str = Depends(require_auth)):
    """Return the authenticated user's profile with token balance and subscription info."""
    result = supabase.table("user_profiles").select("*").eq("id", user_id).execute()

    if not result.data:
        supabase.table("user_profiles").insert({
            "id": user_id,
            "token_balance": 5,
            "tier": "free",
        }).execute()
        return {
            "token_balance": 5,
            "tier": "free",
            "subscription_status": "none",
            "billing_period": None,
            "is_admin": False,
            "display_name": None,
            "earnings_balance": 0,
        }

    profile = result.data[0]
    return {
        "token_balance": profile["token_balance"],
        "tier": profile["tier"],
        "created_at": profile["created_at"],
        "subscription_status": profile.get("subscription_status", "none"),
        "billing_period": profile.get("billing_period"),
        "is_admin": profile.get("is_admin", False),
        "display_name": profile.get("display_name"),
        "earnings_balance": profile.get("earnings_balance", 0),
    }


@router.get("/tokens/history")
async def get_token_history(
    user_id: str = Depends(require_auth),
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
):
    """Return the user's token transaction history."""
    result = (
        supabase.table("token_transactions")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    transactions = []
    for t in result.data:
        transactions.append({
            "id": t["id"],
            "amount": t["amount"],
            "reason": t["reason"],
            "created_at": t["created_at"],
        })

    return {"transactions": transactions, "total": len(transactions)}


async def deduct_tokens(user_id: str, amount: int, reason: str) -> int:
    """Deduct tokens from user's balance atomically. Returns new balance. Raises 402 if insufficient."""
    from datetime import datetime, timezone

    result = supabase.table("user_profiles").select(
        "token_balance, tier, subscription_status, subscription_expires_at"
    ).eq("id", user_id).execute()

    if not result.data:
        supabase.table("user_profiles").insert({
            "id": user_id,
            "token_balance": 5,
            "tier": "free",
        }).execute()
        balance = 5
        tier = "free"
    else:
        profile = result.data[0]
        balance = profile["token_balance"]
        tier = profile["tier"]

        # Check subscription expiry — downgrade if expired
        expires_at = profile.get("subscription_expires_at")
        if tier != "free" and expires_at:
            try:
                exp = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
                if exp < datetime.now(timezone.utc):
                    tier = "free"
            except (ValueError, TypeError):
                pass

    # Unlimited tier with active subscription skips token deduction
    if tier == "unlimited":
        supabase.table("token_transactions").insert({
            "user_id": user_id,
            "amount": -amount,
            "reason": reason,
        }).execute()
        return balance

    # Atomic deduction via RPC — prevents race conditions
    try:
        rpc_result = supabase.rpc("atomic_deduct_tokens", {
            "p_user_id": user_id,
            "p_amount": amount,
            "p_reason": reason,
        }).execute()
        return rpc_result.data
    except Exception as e:
        if "Insufficient tokens" in str(e):
            raise HTTPException(
                status_code=402,
                detail={
                    "message": f"Insufficient tokens. Need {amount}, have {balance}.",
                    "balance": balance,
                    "cost": amount,
                },
            )
        raise


async def add_tokens(user_id: str, amount: int, reason: str) -> int:
    """Add tokens to user's balance. Returns new balance."""
    result = supabase.table("user_profiles").select("token_balance").eq("id", user_id).execute()

    if not result.data:
        supabase.table("user_profiles").insert({
            "id": user_id,
            "token_balance": 5 + amount,
            "tier": "free",
        }).execute()
        new_balance = 5 + amount
    else:
        new_balance = result.data[0]["token_balance"] + amount
        supabase.table("user_profiles").update({"token_balance": new_balance}).eq("id", user_id).execute()

    supabase.table("token_transactions").insert({
        "user_id": user_id,
        "amount": amount,
        "reason": reason,
    }).execute()

    return new_balance


@router.get("/{target_user_id}/public")
async def get_public_profile(target_user_id: str):
    """Get a user's public profile with their approved mods."""
    profile = await get_user_public_profile(target_user_id)
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")

    # Get their approved submissions
    subs = (
        supabase.table("mod_submissions")
        .select("id, title, description, edition, category, download_count, featured, screenshots, created_at")
        .eq("user_id", target_user_id)
        .eq("status", "approved")
        .order("created_at", desc=True)
        .limit(20)
        .execute()
    )

    profile["mods"] = subs.data
    return profile
