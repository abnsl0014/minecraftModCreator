"""Subscription management and payment webhook endpoints.

Uses the pluggable PaymentGateway interface — the active provider is
determined by PAYMENT_GATEWAY env var (see payment_factory.py).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from config import settings
from services.payment_factory import get_gateway
from services.payment_gateway import WebhookEventType
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
    """Create a checkout session via the active payment gateway."""
    user_resp = supabase.auth.admin.get_user_by_id(user_id)
    email = user_resp.user.email or "user@modcrafter.com"
    name = (
        user_resp.user.user_metadata.get("full_name", "ModCrafter User")
        if user_resp.user.user_metadata
        else "ModCrafter User"
    )

    return_url = body.return_url or f"{settings.frontend_url}/pricing?success=true"

    gateway = get_gateway()
    try:
        result = gateway.create_checkout_session(
            plan=body.plan,
            customer_email=email,
            customer_name=name,
            return_url=return_url,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"{gateway.name} checkout failed: {e}")
        raise HTTPException(status_code=502, detail="Payment service unavailable")

    return CheckoutResponse(session_id=result.session_id, checkout_url=result.checkout_url)


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
    """Cancel the user's active subscription via the active payment gateway."""
    result = supabase.table("user_profiles").select(
        "subscription_id, subscription_status"
    ).eq("id", user_id).execute()

    if not result.data or not result.data[0].get("subscription_id"):
        raise HTTPException(status_code=400, detail="No active subscription")

    sub_id = result.data[0]["subscription_id"]
    if result.data[0]["subscription_status"] != "active":
        raise HTTPException(status_code=400, detail="Subscription is not active")

    gateway = get_gateway()
    try:
        gateway.cancel_subscription(sub_id)
    except Exception as e:
        logger.error(f"Failed to cancel subscription {sub_id} via {gateway.name}: {e}")
        raise HTTPException(status_code=502, detail="Failed to cancel subscription")

    # Don't downgrade tier immediately — let them keep access until period ends.
    # The webhook will handle the actual downgrade.
    supabase.table("user_profiles").update({
        "subscription_status": "cancelled",
    }).eq("id", user_id).execute()

    return {"status": "cancelled"}


# ---------- Webhook (provider-agnostic) ----------

@router.post("/webhook")
async def handle_payment_webhook(request: Request):
    """Unified webhook endpoint for any payment provider.

    The active gateway verifies the signature and parses the payload
    into a normalized WebhookEvent, so the handler logic is identical
    regardless of provider.
    """
    payload = await request.body()
    headers = dict(request.headers)

    gateway = get_gateway()

    if not gateway.verify_webhook(payload, headers):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")

    try:
        event = gateway.parse_webhook(payload)
    except (ValueError, Exception) as e:
        logger.warning(f"Failed to parse {gateway.name} webhook: {e}")
        raise HTTPException(status_code=400, detail="Invalid webhook payload")

    logger.info(f"Webhook [{gateway.name}]: {event.event_type.value}")

    if event.event_type == WebhookEventType.SUBSCRIPTION_ACTIVE:
        await _handle_subscription_active(event, gateway)
    elif event.event_type == WebhookEventType.SUBSCRIPTION_RENEWED:
        await _handle_subscription_renewed(event)
    elif event.event_type in (WebhookEventType.SUBSCRIPTION_FAILED, WebhookEventType.SUBSCRIPTION_ON_HOLD):
        await _handle_subscription_failed(event)
    elif event.event_type == WebhookEventType.PAYMENT_SUCCEEDED:
        logger.info(f"Payment succeeded: {event.payment_id or 'unknown'}")
    elif event.event_type == WebhookEventType.PAYMENT_FAILED:
        logger.warning(f"Payment failed: {event.payment_id or 'unknown'}")

    return {"received": True}


# Legacy Dodo webhook endpoint — kept for backwards compatibility during migration
@router.post("/webhooks/dodo")
async def handle_dodo_webhook_legacy(request: Request):
    """Legacy DodoPayments webhook URL. Forwards to the unified handler."""
    return await handle_payment_webhook(request)


# ---------- Webhook handlers (provider-agnostic) ----------

async def _handle_subscription_active(event, gateway):
    """Handle subscription activation — upgrade user tier and grant tokens."""
    if not event.subscription_id or not event.product_id:
        logger.error(f"Missing subscription_id or product_id in webhook: {event}")
        return

    if not event.customer_email:
        logger.error(f"Missing customer email in webhook: {event}")
        return

    tier_map = gateway.get_product_tier_map()
    tier_info = tier_map.get(event.product_id)
    if not tier_info:
        logger.error(f"Unknown product_id in webhook: {event.product_id}")
        return

    tier, billing_period, token_grant = tier_info

    # Look up user by email
    user_id = await _find_user_by_email(event.customer_email)
    if not user_id:
        logger.error(f"No user found for email: {event.customer_email}")
        return

    update_data = {
        "tier": tier,
        "subscription_id": event.subscription_id,
        "subscription_status": "active",
        "billing_period": billing_period,
    }
    if event.current_period_end:
        update_data["subscription_expires_at"] = event.current_period_end
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


async def _handle_subscription_renewed(event):
    """Handle subscription renewal — reset token balance."""
    if not event.subscription_id:
        return

    result = supabase.table("user_profiles").select(
        "id, tier"
    ).eq("subscription_id", event.subscription_id).execute()

    if not result.data:
        logger.error(f"No user found for subscription: {event.subscription_id}")
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


async def _handle_subscription_failed(event):
    """Handle subscription failure — downgrade to free tier."""
    if not event.subscription_id:
        return

    result = supabase.table("user_profiles").select("id").eq(
        "subscription_id", event.subscription_id
    ).execute()

    if not result.data:
        return

    user_id = result.data[0]["id"]

    supabase.table("user_profiles").update({
        "tier": "free",
        "subscription_status": event.status or "failed",
        "token_balance": 5,
    }).eq("id", user_id).execute()

    supabase.table("token_transactions").insert({
        "user_id": user_id,
        "amount": 0,
        "reason": "subscription_failed",
    }).execute()

    logger.info(f"User {user_id} downgraded to free (subscription failed/on_hold)")


async def _find_user_by_email(email: str) -> str | None:
    """Look up a user ID by email via RPC, with admin API fallback."""
    user_result = supabase.rpc("get_user_id_by_email", {"lookup_email": email}).execute()
    user_id = user_result.data if isinstance(user_result.data, str) else None

    if not user_id:
        try:
            users = supabase.auth.admin.list_users(f"email=eq.{email}")
            if users and len(users) > 0:
                user_id = users[0].id
        except Exception:
            pass

    return user_id
