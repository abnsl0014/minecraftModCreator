"""Payment gateway factory — returns the active provider based on config.

Usage:
    from services.payment_factory import get_gateway
    gateway = get_gateway()  # returns the configured PaymentGateway instance
"""

import logging
from functools import lru_cache

from config import settings
from services.payment_gateway import PaymentGateway

logger = logging.getLogger(__name__)

# Registry of available gateways (lazy imports to avoid import errors
# when a provider's SDK isn't installed)
_GATEWAY_REGISTRY: dict[str, type] = {}


def _ensure_registry():
    if _GATEWAY_REGISTRY:
        return

    try:
        from services.dodo_gateway import DodoGateway
        _GATEWAY_REGISTRY["dodo"] = DodoGateway
    except ImportError:
        logger.debug("DodoPayments SDK not installed — dodo gateway unavailable")

    try:
        from services.razorpay_gateway import RazorpayGateway
        _GATEWAY_REGISTRY["razorpay"] = RazorpayGateway
    except ImportError:
        logger.debug("Razorpay SDK not installed — razorpay gateway unavailable")


@lru_cache(maxsize=1)
def get_gateway() -> PaymentGateway:
    """Return a singleton instance of the configured payment gateway."""
    _ensure_registry()

    provider = settings.payment_gateway
    gateway_cls = _GATEWAY_REGISTRY.get(provider)

    if gateway_cls is None:
        available = list(_GATEWAY_REGISTRY.keys())
        raise RuntimeError(
            f"Payment gateway '{provider}' not available. "
            f"Installed gateways: {available}. "
            f"Check PAYMENT_GATEWAY env var and ensure the SDK is installed."
        )

    instance = gateway_cls()
    logger.info(f"Payment gateway initialized: {instance.name}")
    return instance


def get_available_gateways() -> list[str]:
    """List all gateways whose SDKs are installed."""
    _ensure_registry()
    return list(_GATEWAY_REGISTRY.keys())
