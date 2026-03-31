"""Subscription management and DodoPayments webhook endpoints."""
import hashlib
import hmac
import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config import settings
from services.dodo_payments import (
    create_checkout_session,
    cancel_subscription as dodo_cancel,
    get_product_tier_map,
)
from utils.auth import require_auth
from utils.supabase_client import supabase

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/subscriptions")


# ---------- Request/Response models ----------

class CheckoutRequest(BaseModel):
    plan: str  # basic_weekly, basic_monthly, unlimited_monthly
    return_url: str | None = None


class CheckoutResponse(BaseModel):
    checkout_url: str
    session_id: str


# ---------- Checkout ----------

@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(body: CheckoutRequest, user_id: str = Depends(require_auth)):
    """Create a DodoPayments checkout session for the given plan."""
    user_resp = supabase.auth.admin.get_user_by_id(user_id)
    email = user_resp.user.email or "user@modcrafter.com"
    name = user_resp.user.user_metadata.get("full_name", "ModCrafter User") if user_resp.user.user_metadata else "ModCrafter User"

    return_url = body.return_url or f"{settings.frontend_url}/pricing?success=true"

    try:
        result = create_checkout_session(
            plan=body.plan,
            customer_email=email,
            customer_name=name,
            return_url=return_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"DodoPayments checkout failed: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")

    return CheckoutResponse(**result)


# ---------- Subscription Status ----------

@router.get("/status")
async def subscription_status(user_id: str = Depends(require_auth)):
    """Get the current user's subscription info."""
    result = supabase.table("user_profiles").select(
        "tier, subscription_id, subscription_status, billing_period, subscription_expires_at"
    ).eq("id", user_id).execute()

    if not result.data:
        return {
            "tier": "free",
            "subscription_status": "none",
            "billing_period": None,
            "subscription_expires_at": None,
        }

    profile = result.data[0]
    return {
        "tier": profile["tier"],
        "subscription_status": profile["subscription_status"],
        "billing_period": profile.get("billing_period"),
        "subscription_expires_at": profile.get("subscription_expires_at"),
    }


# ---------- Cancel Subscription ----------

@router.post("/cancel")
async def cancel_subscription(user_id: str = Depends(require_auth)):
    """Cancel the user's active subscription."""
    result = supabase.table("user_profiles").select(
        "subscription_id, subscription_status"
    ).eq("id", user_id).execute()

    if not result.data or not result.data[0].get("subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription")

    sub_id = result.data[0]["subscription_id"]
    if result.data[0]["subscription_status"] != "active":
        raise HTTPException(status_code=400, detail="Subscription is not active")

    try:
        dodo_cancel(sub_id)
    except Exception as e:
        logger.error(f"Failed to cancel subscription {sub_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to cancel subscription")

    supabase.table("user_profiles").update({
        "subscription_status": "cancelled",
        "tier": "free",
    }).eq("id", user_id).execute()

    return {"status": "cancelled"}


# ---------- Webhook ----------

def _verify_webhook_signature(payload: bytes, signature: str) -> bool:
    """Verify DodoPayments webhook signature."""
    if not settings.dodo_payments_webhook_key:
        logger.warning("Webhook key not configured, skipping verification")
        return True
    expected = hmac.new(
        settings.dodo_payments_webhook_key.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post("/webhooks/dodo")
async def handle_dodo_webhook(request: Request):
    """Handle DodoPayments webhook events."""
    payload = await request.body()
    signature = request.headers.get("x-dodo-signature", "")

    if not _verify_webhook_signature(payload, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event = json.loads(payload)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("type", "")
    data = event.get("data", {})

    logger.info(f"Webhook received: {event_type}")

    if event_type == "subscription.active":
        await _handle_subscription_active(data)
    elif event_type == "subscription.renewed":
        await _handle_subscription_renewed(data)
    elif event_type in ("subscription.on_hold", "subscription.failed"):
        await _handle_subscription_failed(data)
    elif event_type == "payment.succeeded":
        logger.info(f"Payment succeeded: {data.get('payment_id', 'unknown')}")
    elif event_type == "payment.failed":
        logger.warning(f"Payment failed: {data.get('payment_id', 'unknown')}")

    return {"received": True}


async def _handle_subscription_active(data: dict):
    """Handle subscription activation — upgrade user tier and grant tokens."""
    subscription_id = data.get("subscription_id")
    product_id = data.get("product_id")
    customer_email = data.get("customer", {}).get("email")

    if not subscription_id or not product_id:
        logger.error(f"Missing subscription_id or product_id in webhook: {data}")
        return

    tier_map = get_product_tier_map()
    tier_info = tier_map.get(product_id)
    if not tier_info:
        logger.error(f"Unknown product_id in webhook: {product_id}")
        return

    tier, billing_period, token_grant = tier_info

    # Find user by email (DodoPayments doesn't know our user_id)
    user_result = supabase.auth.admin.list_users()
    user_id = None
    for user in user_result:
        if hasattr(user, 'email') and user.email == customer_email:
            user_id = user.id
            break

    if not user_id:
        logger.error(f"No user found for email: {customer_email}")
        return

    update_data = {
        "tier": tier,
        "subscription_id": subscription_id,
        "subscription_status": "active",
        "billing_period": billing_period,
    }
    if token_grant > 0:
        update_data["token_balance"] = token_grant

    supabase.table("user_profiles").update(update_data).eq("id", user_id).execute()

    if token_grant > 0:
        supabase.table("token_transactions").insert({
            "user_id": user_id,
            "amount": token_grant,
            "reason": "subscription_purchase",
        }).execute()

    logger.info(f"User {user_id} upgraded to {tier} ({billing_period})")


async def _handle_subscription_renewed(data: dict):
    """Handle subscription renewal — reset token balance."""
    subscription_id = data.get("subscription_id")
    if not subscription_id:
        return

    result = supabase.table("user_profiles").select(
        "id, tier"
    ).eq("subscription_id", subscription_id).execute()

    if not result.data:
        logger.error(f"No user found for subscription: {subscription_id}")
        return

    user = result.data[0]
    user_id = user["id"]
    tier = user["tier"]

    if tier == "basic":
        supabase.table("user_profiles").update({
            "token_balance": 600,
            "subscription_status": "active",
        }).eq("id", user_id).execute()

        supabase.table("token_transactions").insert({
            "user_id": user_id,
            "amount": 600,
            "reason": "subscription_renewal",
        }).execute()

    logger.info(f"Subscription renewed for user {user_id}")


async def _handle_subscription_failed(data: dict):
    """Handle subscription failure — downgrade to free tier."""
    subscription_id = data.get("subscription_id")
    if not subscription_id:
        return

    result = supabase.table("user_profiles").select("id").eq(
        "subscription_id", subscription_id
    ).execute()

    if not result.data:
        return

    user_id = result.data[0]["id"]

    supabase.table("user_profiles").update({
        "tier": "free",
        "subscription_status": data.get("status", "failed"),
        "token_balance": 5,
    }).eq("id", user_id).execute()

    supabase.table("token_transactions").insert({
        "user_id": user_id,
        "amount": 0,
        "reason": "subscription_cancelled",
    }).execute()

    logger.info(f"User {user_id} downgraded to free (subscription failed/on_hold)")
