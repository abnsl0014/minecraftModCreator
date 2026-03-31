"""DodoPayments SDK wrapper for subscription management."""
import logging

from dodopayments import DodoPayments

from config import settings

logger = logging.getLogger(__name__)

# Initialize client (lazy — only fails if actually called without key)
_client = None


def _get_client() -> DodoPayments:
    global _client
    if _client is None:
        _client = DodoPayments(
            bearer_token=settings.dodo_payments_api_key,
            environment=settings.dodo_payments_environment,
        )
    return _client


# Map plan names to product IDs
PLAN_PRODUCTS = {
    "basic_weekly": lambda: settings.dodo_product_basic_weekly,
    "basic_monthly": lambda: settings.dodo_product_basic_monthly,
    "unlimited_monthly": lambda: settings.dodo_product_unlimited_monthly,
}

# Map product IDs to tier + billing info (populated at runtime)
def get_product_tier_map() -> dict:
    """Returns {product_id: (tier, billing_period, token_grant)}."""
    return {
        settings.dodo_product_basic_weekly: ("basic", "weekly", 600),
        settings.dodo_product_basic_monthly: ("basic", "monthly", 600),
        settings.dodo_product_unlimited_monthly: ("unlimited", "monthly", 0),
    }


def create_checkout_session(
    plan: str,
    customer_email: str,
    customer_name: str,
    return_url: str,
) -> dict:
    """Create a DodoPayments checkout session for a subscription plan.

    Returns dict with 'session_id' and 'checkout_url'.
    """
    product_id_fn = PLAN_PRODUCTS.get(plan)
    if not product_id_fn:
        raise ValueError(f"Unknown plan: {plan}")

    product_id = product_id_fn()
    if not product_id:
        raise ValueError(f"Product ID not configured for plan: {plan}")

    client = _get_client()
    session = client.checkout_sessions.create(
        product_cart=[{"product_id": product_id, "quantity": 1}],
        customer={"email": customer_email, "name": customer_name},
        return_url=return_url,
    )

    return {
        "session_id": session.session_id,
        "checkout_url": session.checkout_url,
    }


def get_subscription(subscription_id: str) -> dict:
    """Get subscription details from DodoPayments."""
    client = _get_client()
    sub = client.subscriptions.retrieve(subscription_id)
    return {
        "subscription_id": sub.subscription_id,
        "status": sub.status,
        "product_id": sub.product_id,
        "current_period_end": str(sub.current_period_end) if hasattr(sub, "current_period_end") else None,
    }


def cancel_subscription(subscription_id: str) -> bool:
    """Cancel a subscription. Returns True on success."""
    client = _get_client()
    client.subscriptions.update(subscription_id, status="cancelled")
    return True
