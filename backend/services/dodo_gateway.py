"""DodoPayments gateway — implements PaymentGateway interface."""

import hashlib
import hmac
import json
import logging

from dodopayments import DodoPayments

from config import settings
from services.payment_gateway import (
    PaymentGateway,
    CheckoutResult,
    WebhookEvent,
    WebhookEventType,
)

logger = logging.getLogger(__name__)

# Plan key → config accessor
_PLAN_PRODUCTS = {
    "basic_weekly": lambda: settings.dodo_product_basic_weekly,
    "basic_monthly": lambda: settings.dodo_product_basic_monthly,
    "unlimited_monthly": lambda: settings.dodo_product_unlimited_monthly,
}

_EVENT_MAP = {
    "subscription.active": WebhookEventType.SUBSCRIPTION_ACTIVE,
    "subscription.renewed": WebhookEventType.SUBSCRIPTION_RENEWED,
    "subscription.on_hold": WebhookEventType.SUBSCRIPTION_ON_HOLD,
    "subscription.failed": WebhookEventType.SUBSCRIPTION_FAILED,
    "payment.succeeded": WebhookEventType.PAYMENT_SUCCEEDED,
    "payment.failed": WebhookEventType.PAYMENT_FAILED,
}


class DodoGateway(PaymentGateway):
    def __init__(self):
        self._client = None

    @property
    def name(self) -> str:
        return "dodo"

    def _get_client(self) -> DodoPayments:
        if self._client is None:
            self._client = DodoPayments(
                bearer_token=settings.dodo_payments_api_key,
                environment=settings.dodo_payments_environment,
            )
        return self._client

    def create_checkout_session(
        self,
        plan: str,
        customer_email: str,
        customer_name: str,
        return_url: str,
    ) -> CheckoutResult:
        product_id_fn = _PLAN_PRODUCTS.get(plan)
        if not product_id_fn:
            raise ValueError(f"Unknown plan: {plan}")

        product_id = product_id_fn()
        if not product_id:
            raise ValueError(f"Product ID not configured for plan: {plan}")

        client = self._get_client()
        session = client.checkout_sessions.create(
            product_cart=[{"product_id": product_id, "quantity": 1}],
            customer={"email": customer_email, "name": customer_name},
            return_url=return_url,
        )

        return CheckoutResult(
            session_id=session.session_id,
            checkout_url=session.checkout_url,
        )

    def cancel_subscription(self, subscription_id: str) -> bool:
        client = self._get_client()
        client.subscriptions.update(subscription_id, status="cancelled")
        return True

    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        signature = headers.get("x-dodo-signature", "")
        if not settings.dodo_payments_webhook_key:
            logger.error("Dodo webhook key not configured — rejecting")
            return False
        expected = hmac.new(
            settings.dodo_payments_webhook_key.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)

    def parse_webhook(self, payload: bytes) -> WebhookEvent:
        data = json.loads(payload)
        event_type_str = data.get("type", "")
        event_type = _EVENT_MAP.get(event_type_str)
        if event_type is None:
            raise ValueError(f"Unknown Dodo event type: {event_type_str}")

        inner = data.get("data", {})
        return WebhookEvent(
            event_type=event_type,
            subscription_id=inner.get("subscription_id"),
            product_id=inner.get("product_id"),
            customer_email=inner.get("customer", {}).get("email"),
            current_period_end=inner.get("current_period_end"),
            payment_id=inner.get("payment_id"),
            status=inner.get("status"),
            raw_data=inner,
        )

    def get_product_tier_map(self) -> dict[str, tuple[str, str, int]]:
        return {
            settings.dodo_product_basic_weekly: ("basic", "weekly", 600),
            settings.dodo_product_basic_monthly: ("basic", "monthly", 600),
            settings.dodo_product_unlimited_monthly: ("unlimited", "monthly", 0),
        }
