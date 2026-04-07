"""Abstract payment gateway interface for plug-in/plug-out provider support.

All payment providers (DodoPayments, Razorpay, Stripe, etc.) implement this
interface. The active provider is selected via PAYMENT_GATEWAY env var.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class WebhookEventType(str, Enum):
    SUBSCRIPTION_ACTIVE = "subscription.active"
    SUBSCRIPTION_RENEWED = "subscription.renewed"
    SUBSCRIPTION_FAILED = "subscription.failed"
    SUBSCRIPTION_ON_HOLD = "subscription.on_hold"
    PAYMENT_SUCCEEDED = "payment.succeeded"
    PAYMENT_FAILED = "payment.failed"


@dataclass
class CheckoutResult:
    """Normalized result from creating a checkout session."""
    session_id: str
    checkout_url: str


@dataclass
class WebhookEvent:
    """Normalized webhook event — provider-agnostic."""
    event_type: WebhookEventType
    subscription_id: Optional[str] = None
    product_id: Optional[str] = None
    customer_email: Optional[str] = None
    current_period_end: Optional[str] = None
    payment_id: Optional[str] = None
    status: Optional[str] = None
    raw_data: Optional[dict] = None


class PaymentGateway(ABC):
    """Interface that every payment provider must implement."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable gateway name (e.g. 'razorpay', 'dodo')."""

    @abstractmethod
    def create_checkout_session(
        self,
        plan: str,
        customer_email: str,
        customer_name: str,
        return_url: str,
    ) -> CheckoutResult:
        """Create a checkout/subscription session. Returns normalized result."""

    @abstractmethod
    def cancel_subscription(self, subscription_id: str) -> bool:
        """Cancel an active subscription. Returns True on success."""

    @abstractmethod
    def verify_webhook(self, payload: bytes, headers: dict) -> bool:
        """Verify the webhook signature from this provider."""

    @abstractmethod
    def parse_webhook(self, payload: bytes) -> WebhookEvent:
        """Parse raw webhook payload into a normalized WebhookEvent."""

    @abstractmethod
    def get_product_tier_map(self) -> dict[str, tuple[str, str, int]]:
        """Return {product_id: (tier, billing_period, token_grant)}."""
