"""Razorpay gateway — implements PaymentGateway interface.

Uses Razorpay Subscriptions API for recurring billing.
Checkout is done via Razorpay's short_url on subscriptions (hosted page).
"""

import hashlib
import hmac
import json
import logging

import razorpay

from config import settings
from services.payment_gateway import (
    PaymentGateway,
    CheckoutResult,
    WebhookEvent,
    WebhookEventType,
)

logger = logging.getLogger(__name__)

# Razorpay plan key → config accessor for Razorpay Plan IDs
_PLAN_IDS = {
    "basic_weekly": lambda: settings.razorpay_plan_basic_weekly,
    "basic_monthly": lambda: settings.razorpay_plan_basic_monthly,
    "unlimited_monthly": lambda: settings.razorpay_plan_unlimited_monthly,
}

# Razorpay webhook events → normalized types
_EVENT_MAP = {
    "subscription.activated": WebhookEventType.SUBSCRIPTION_ACTIVE,
    "subscription.charged": WebhookEventType.SUBSCRIPTION_RENEWED,
    "subscription.halted": WebhookEventType.SUBSCRIPTION_FAILED,
    "subscription.paused": WebhookEventType.SUBSCRIPTION_ON_HOLD,
    "subscription.cancelled": WebhookEventType.SUBSCRIPTION_FAILED,
    "payment.captured": WebhookEventType.PAYMENT_SUCCEEDED,
    "payment.failed": WebhookEventType.PAYMENT_FAILED,
}


class RazorpayGateway(PaymentGateway):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "razorpay"

    def _get_client(self) -> razorpay.Client:
        if self._client is None:
            self._client = razorpay.Client(
                auth=(settings.razorpay_key_id, settings.razorpay_key_secret),
            )
        return self._client

    def create_checkout_session(
        self,
        plan: str,
        customer_email: str,
        customer_name: str,
        return_url: str,
    ) -> CheckoutResult:
        plan_id_fn = _PLAN_IDS.get(plan)
        if not plan_id_fn:
            raise ValueError(f"Unknown plan: {plan}")

        plan_id = plan_id_fn()
        if not plan_id:
            raise ValueError(f"Razorpay Plan ID not configured for plan: {plan}")

        client = self._get_client()

        # Create a Razorpay subscription — returns a short_url for hosted checkout
        subscription = client.subscription.create({
            "plan_id": plan_id,
            "total_count": 120,  # max billing cycles (effectively unlimited)
            "quantity": 1,
            "customer_notify": 1,
            "notes": {
                "customer_email": customer_email,
                "customer_name": customer_name,
                "plan": plan,
            },
        })

        subscription_id = subscription["id"]
        short_url = subscription.get("short_url")

        if not short_url:
            # Fallback: build Razorpay checkout URL manually
            short_url = f"https://rzp.io/i/{subscription_id}"

        return CheckoutResult(
            session_id=subscription_id,
            checkout_url=short_url,
        )

    def cancel_subscription(self, subscription_id: str) -> bool:
        client = self._get_client()
        client.subscription.cancel(subscription_id, {"cancel_at_cycle_end": 1})
        return True

    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        signature = headers.get("x-razorpay-signature", "")
        if not settings.razorpay_webhook_secret:
            logger.error("Razorpay webhook secret not configured — rejecting")
            return False
        expected = hmac.new(
            settings.razorpay_webhook_secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload: bytes) -> WebhookEvent:
        data = json.loads(payload)
        event_type_str = data.get("event", "")
        event_type = _EVENT_MAP.get(event_type_str)
        if event_type is None:
            raise ValueError(f"Unknown Razorpay event: {event_type_str}")

        entity = data.get("payload", {})

        # Extract subscription data
        sub_entity = entity.get("subscription", {}).get("entity", {})
        payment_entity = entity.get("payment", {}).get("entity", {})

        subscription_id = sub_entity.get("id") or payment_entity.get("subscription_id")
        plan_id = sub_entity.get("plan_id")
        customer_email = (
            sub_entity.get("notes", {}).get("customer_email")
            or payment_entity.get("email")
        )
        current_period_end = sub_entity.get("current_end")
        # Razorpay sends epoch timestamps — convert to ISO if present
        if current_period_end and isinstance(current_period_end, (int, float)):
            from datetime import datetime, timezone
            current_period_end = datetime.fromtimestamp(
                current_period_end, tz=timezone.utc
            ).isoformat()

        return WebhookEvent(
            event_type=event_type,
            subscription_id=subscription_id,
            product_id=plan_id,
            customer_email=customer_email,
            current_period_end=current_period_end,
            payment_id=payment_entity.get("id"),
            status=sub_entity.get("status"),
            raw_data=data,
        )

    def get_product_tier_map(self) -> dict[str, tuple[str, str, int]]:
        return {
            settings.razorpay_plan_basic_weekly: ("basic", "weekly", 600),
            settings.razorpay_plan_basic_monthly: ("basic", "monthly", 600),
            settings.razorpay_plan_unlimited_monthly: ("unlimited", "monthly", 0),
        }
