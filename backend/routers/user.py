"""User profile and token management endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query

from utils.auth import require_auth
from utils.supabase_client import supabase

router = APIRouter(prefix="/api/user")


@router.get("/profile")
async def get_profile(user_id: str = Depends(require_auth)):
    """Return the authenticated user's profile with token balance."""
    result = supabase.table("user_profiles").select("*").eq("id", user_id).execute()

    if not result.data:
        # Auto-create profile if missing (e.g. user signed up before migration)
        supabase.table("user_profiles").insert({
            "id": user_id,
            "token_balance": 5,
            "tier": "free",
        }).execute()
        return {"token_balance": 5, "tier": "free"}

    profile = result.data[0]
    return {
        "token_balance": profile["token_balance"],
        "tier": profile["tier"],
        "created_at": profile["created_at"],
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
    """Deduct tokens from user's balance. Returns new balance. Raises 402 if insufficient."""
    # Get current balance
    result = supabase.table("user_profiles").select("token_balance, tier").eq("id", user_id).execute()

    if not result.data:
        # Auto-create profile
        supabase.table("user_profiles").insert({
            "id": user_id,
            "token_balance": 5,
            "tier": "free",
        }).execute()
        balance = 5
        tier = "free"
    else:
        balance = result.data[0]["token_balance"]
        tier = result.data[0]["tier"]

    # Unlimited tier skips token check
    if tier == "unlimited":
        # Still log the transaction
        supabase.table("token_transactions").insert({
            "user_id": user_id,
            "amount": -amount,
            "reason": reason,
        }).execute()
        return balance

    if balance < amount:
        raise HTTPException(
            status_code=402,
            detail={
                "message": f"Insufficient tokens. Need {amount}, have {balance}.",
                "balance": balance,
                "cost": amount,
            },
        )

    new_balance = balance - amount

    # Update balance and log transaction
    supabase.table("user_profiles").update({"token_balance": new_balance}).eq("id", user_id).execute()
    supabase.table("token_transactions").insert({
        "user_id": user_id,
        "amount": -amount,
        "reason": reason,
    }).execute()

    return new_balance


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
