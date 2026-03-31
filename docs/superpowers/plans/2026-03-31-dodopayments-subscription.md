# DodoPayments Subscription Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add subscription payments via DodoPayments so users can upgrade to Basic (₹99/week or ₹399/month, 600 tokens, no ads) or Unlimited (₹599/month, unlimited tokens, no ads).

**Architecture:** Backend creates DodoPayments checkout sessions via their Python SDK. Users pay on DodoPayments hosted checkout. Webhooks update the user's tier and token balance in Supabase. Frontend pricing page updated with INR plans and real checkout flow.

**Tech Stack:** DodoPayments Python SDK (`dodopayments`), FastAPI, Supabase (PostgreSQL), Next.js 16 (React 19)

---

## File Structure

### New files
- `backend/routers/subscriptions.py` — Checkout + webhook + subscription status endpoints
- `backend/services/dodo_payments.py` — DodoPayments SDK wrapper
- `supabase/migration-003-subscriptions.sql` — Schema changes for subscription tracking

### Modified files
- `backend/config.py` — Add DodoPayments env vars
- `backend/main.py` — Register subscriptions router
- `backend/requirements.txt` — Add `dodopayments` package
- `backend/routers/user.py` — Return subscription fields in profile
- `frontend/src/lib/api.ts` — Add subscription API calls
- `frontend/src/app/pricing/page.tsx` — INR plans, checkout redirect, subscription status

---

### Task 1: Database Migration for Subscriptions

**Files:**
- Create: `supabase/migration-003-subscriptions.sql`

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migration-003-subscriptions.sql`:

```sql
-- Migration 003: Subscription support for DodoPayments
-- Run this in Supabase SQL Editor

-- Add subscription columns to user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS billing_period TEXT,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ;

-- Index for looking up users by subscription_id (webhook handler)
CREATE INDEX IF NOT EXISTS idx_user_profiles_subscription_id
  ON user_profiles(subscription_id)
  WHERE subscription_id IS NOT NULL;

-- Update tier check: add 'basic' tier
-- (tier column is TEXT with no CHECK constraint, so no migration needed for that)
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migration-003-subscriptions.sql
git commit -m "feat: add subscription columns to user_profiles schema"
```

---

### Task 2: Backend Config + Dependencies

**Files:**
- Modify: `backend/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add dodopayments to requirements.txt**

Append to `backend/requirements.txt`:

```
dodopayments==1.92.1
```

- [ ] **Step 2: Add DodoPayments settings to config.py**

Add these fields to the `Settings` class in `backend/config.py`:

```python
dodo_payments_api_key: str = ""
dodo_payments_webhook_key: str = ""
dodo_payments_environment: str = "test_mode"  # test_mode or live_mode
# DodoPayments product IDs (create these in the dashboard)
dodo_product_basic_weekly: str = ""
dodo_product_basic_monthly: str = ""
dodo_product_unlimited_monthly: str = ""
```

- [ ] **Step 3: Commit**

```bash
git add backend/config.py backend/requirements.txt
git commit -m "feat: add DodoPayments config and SDK dependency"
```

---

### Task 3: DodoPayments Service Layer

**Files:**
- Create: `backend/services/dodo_payments.py`

- [ ] **Step 1: Create the DodoPayments service wrapper**

Create `backend/services/dodo_payments.py`:

```python
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
```

- [ ] **Step 2: Commit**

```bash
git add backend/services/dodo_payments.py
git commit -m "feat: add DodoPayments service layer for checkout and subscriptions"
```

---

### Task 4: Subscriptions Router (Checkout + Status + Cancel)

**Files:**
- Create: `backend/routers/subscriptions.py`
- Modify: `backend/main.py`

- [ ] **Step 1: Create the subscriptions router**

Create `backend/routers/subscriptions.py`:

```python
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
    # Get user email from Supabase auth
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

    # Update local state
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

    # Update profile
    update_data = {
        "tier": tier,
        "subscription_id": subscription_id,
        "subscription_status": "active",
        "billing_period": billing_period,
    }
    if token_grant > 0:
        update_data["token_balance"] = token_grant

    supabase.table("user_profiles").update(update_data).eq("id", user_id).execute()

    # Log token grant transaction
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

    # Reset tokens for basic tier (600), unlimited doesn't need reset
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
```

- [ ] **Step 2: Register the router in main.py**

Add to `backend/main.py` after the existing router imports:

```python
from routers.subscriptions import router as subscriptions_router
```

And add after the existing `app.include_router` calls:

```python
app.include_router(subscriptions_router)
```

- [ ] **Step 3: Commit**

```bash
git add backend/routers/subscriptions.py backend/main.py
git commit -m "feat: add subscription checkout, webhook, status, and cancel endpoints"
```

---

### Task 5: Update User Profile API to Return Subscription Fields

**Files:**
- Modify: `backend/routers/user.py:10-29`

- [ ] **Step 1: Update get_profile to include subscription fields**

In `backend/routers/user.py`, update the `get_profile` endpoint to return subscription info:

```python
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
        }

    profile = result.data[0]
    return {
        "token_balance": profile["token_balance"],
        "tier": profile["tier"],
        "created_at": profile["created_at"],
        "subscription_status": profile.get("subscription_status", "none"),
        "billing_period": profile.get("billing_period"),
    }
```

- [ ] **Step 2: Commit**

```bash
git add backend/routers/user.py
git commit -m "feat: include subscription fields in user profile response"
```

---

### Task 6: Frontend API Functions for Subscriptions

**Files:**
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add subscription API functions**

Append to `frontend/src/lib/api.ts`:

```typescript
// ---- Subscription APIs ----

export interface SubscriptionStatus {
  tier: string;
  subscription_status: string;
  billing_period: string | null;
  subscription_expires_at: string | null;
}

export async function createCheckoutSession(
  plan: string,
  returnUrl?: string,
): Promise<{ checkout_url: string; session_id: string }> {
  const res = await fetch(`${API_BASE}/api/subscriptions/checkout`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ plan, return_url: returnUrl }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Checkout failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Checkout failed");
  }
  return res.json();
}

export async function getSubscriptionStatus(): Promise<SubscriptionStatus> {
  const res = await fetch(`${API_BASE}/api/subscriptions/status`, {
    headers: await authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to fetch subscription status");
  return res.json();
}

export async function cancelSubscription(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/subscriptions/cancel`, {
    method: "POST",
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Cancel failed" }));
    throw new Error(typeof err.detail === "string" ? err.detail : "Cancel failed");
  }
  return res.json();
}
```

- [ ] **Step 2: Update UserProfile interface**

Update the existing `UserProfile` interface in `frontend/src/lib/api.ts`:

```typescript
export interface UserProfile {
  token_balance: number;
  tier: string;
  created_at?: string;
  subscription_status?: string;
  billing_period?: string | null;
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat: add subscription checkout, status, and cancel API functions"
```

---

### Task 7: Update Pricing Page with INR Plans and Checkout Flow

**Files:**
- Modify: `frontend/src/app/pricing/page.tsx`

- [ ] **Step 1: Rewrite the pricing page**

Replace the full content of `frontend/src/app/pricing/page.tsx` with the updated version that:

1. Uses INR pricing: Free / Basic Weekly ₹99 / Basic Monthly ₹399 / Unlimited ₹599
2. Calls `createCheckoutSession()` on subscribe click → redirects to DodoPayments
3. Shows `?success=true` banner when returning from checkout
4. Shows current subscription status and cancel button for active subscribers
5. Hides "Earn Free Tokens" section for paid users

```tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Header from "@/components/Header";
import {
  getUserProfile,
  getTokenHistory,
  createCheckoutSession,
  cancelSubscription,
  TokenTransaction,
  UserProfile,
} from "@/lib/api";
import { isAuthenticated } from "@/lib/supabase";
import SignupModal from "@/components/SignupModal";

const FONT = { fontFamily: "var(--font-pixel), monospace" } as const;

const PLANS = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    plan_key: null,
    badge: null,
    highlight: false,
    color: "#55ff55",
    features: [
      "5 tokens per day",
      "Basic mod creation",
      "Community gallery access",
      "Bedrock edition only",
      "Ad-supported",
    ],
  },
  {
    name: "Basic Weekly",
    price: "₹99",
    period: "/week",
    plan_key: "basic_weekly",
    badge: null,
    highlight: false,
    color: "#55aaff",
    features: [
      "600 tokens per week",
      "No ads",
      "Java + Bedrock editions",
      "All mod categories",
      "Custom textures",
    ],
  },
  {
    name: "Basic Monthly",
    price: "₹399",
    period: "/month",
    plan_key: "basic_monthly",
    badge: "BEST VALUE",
    highlight: true,
    color: "#d4a017",
    features: [
      "600 tokens per month",
      "No ads",
      "Java + Bedrock editions",
      "All mod categories",
      "Custom textures",
    ],
  },
  {
    name: "Unlimited",
    price: "₹599",
    period: "/month",
    plan_key: "unlimited_monthly",
    badge: null,
    highlight: false,
    color: "#aa55ff",
    features: [
      "Unlimited creates",
      "No ads",
      "Instant generation",
      "Priority support",
      "Early access to features",
    ],
  },
] as const;

const EARN_METHODS = [
  {
    title: "Watch Ads",
    desc: "Watch a short video to earn 2 tokens",
    reward: "+2",
    color: "#ffaa00",
    button: "Watch Ad",
  },
  {
    title: "Download App",
    desc: "Download our partner app to earn 10 tokens",
    reward: "+10",
    color: "#55ff55",
    button: "Get App",
  },
  {
    title: "Daily Login",
    desc: "Login daily for 1 bonus token",
    reward: "+1",
    color: "#5555ff",
    button: null,
  },
  {
    title: "Share Creation",
    desc: "Share a mod on social media for 3 tokens",
    reward: "+3",
    color: "#aa55ff",
    button: "Share",
  },
] as const;

const REASON_LABELS: Record<string, string> = {
  mod_generation: "Mod Created",
  daily_login: "Daily Login",
  ad_watch: "Ad Watched",
  share: "Share Bonus",
  signup_bonus: "Signup Bonus",
  subscription_purchase: "Subscription",
  subscription_renewal: "Renewal",
  subscription_cancelled: "Sub Cancelled",
};

export default function PricingPage() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tokenHistory, setTokenHistory] = useState<TokenTransaction[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [showSignup, setShowSignup] = useState(false);
  const [successBanner, setSuccessBanner] = useState(false);

  useEffect(() => {
    if (searchParams.get("success") === "true") {
      setSuccessBanner(true);
      // Remove query param from URL without reload
      window.history.replaceState({}, "", "/pricing");
    }
  }, [searchParams]);

  useEffect(() => {
    async function load() {
      const authed = await isAuthenticated();
      setLoggedIn(authed);
      if (!authed) return;
      try {
        const [p, history] = await Promise.all([
          getUserProfile(),
          getTokenHistory(),
        ]);
        setProfile(p);
        setTokenHistory(history.transactions);
      } catch (err) {
        console.error("Failed to load data:", err);
      }
    }
    load();
  }, []);

  const isPaid = profile && profile.tier !== "free";

  async function handleSubscribe(planKey: string) {
    if (!loggedIn) {
      setShowSignup(true);
      return;
    }
    setLoading(planKey);
    try {
      const { checkout_url } = await createCheckoutSession(planKey);
      window.location.href = checkout_url;
    } catch (err: any) {
      alert(err.message || "Failed to start checkout");
      setLoading(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your subscription? You'll be downgraded to the free tier.")) return;
    try {
      await cancelSubscription();
      // Reload profile
      const p = await getUserProfile();
      setProfile(p);
    } catch (err: any) {
      alert(err.message || "Failed to cancel");
    }
  }

  function getPlanButton(plan: typeof PLANS[number]) {
    if (!plan.plan_key) {
      // Free tier
      if (!isPaid) {
        return (
          <div
            className="mc-panel-inset w-full py-3 text-center text-[10px] text-[#55ff55]"
            style={FONT}
          >
            Current Plan
          </div>
        );
      }
      return null;
    }

    // Check if this is the user's current plan
    const isCurrentPlan =
      isPaid &&
      profile?.subscription_status === "active" &&
      ((plan.plan_key === "basic_weekly" && profile.tier === "basic" && profile.billing_period === "weekly") ||
       (plan.plan_key === "basic_monthly" && profile.tier === "basic" && profile.billing_period === "monthly") ||
       (plan.plan_key === "unlimited_monthly" && profile.tier === "unlimited"));

    if (isCurrentPlan) {
      return (
        <button
          className="mc-btn w-full py-3 text-[10px]"
          style={{ background: "#222222", borderColor: "#0d0d0d #3d3d3d #3d3d3d #0d0d0d", ...FONT }}
          onClick={handleCancel}
        >
          Cancel Plan
        </button>
      );
    }

    return (
      <button
        className="mc-btn w-full py-3 text-[10px]"
        style={FONT}
        onClick={() => handleSubscribe(plan.plan_key!)}
        disabled={loading === plan.plan_key}
      >
        {loading === plan.plan_key ? "Loading..." : "Subscribe"}
      </button>
    );
  }

  return (
    <>
      <Header />
      {showSignup && <SignupModal onClose={() => setShowSignup(false)} />}
      <main className="min-h-screen pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">

          {/* Success banner */}
          {successBanner && (
            <div
              className="mc-panel mb-8 p-4 text-center"
              style={{ borderColor: "#55ff55" }}
            >
              <p className="text-[10px] text-[#55ff55]" style={FONT}>
                Payment successful! Your subscription is being activated...
              </p>
            </div>
          )}

          {/* Header */}
          <section className="text-center mb-16">
            <h1
              className="text-[20px] sm:text-[24px] text-[#d4a017] mb-3"
              style={FONT}
            >
              Tokens &amp; Pricing
            </h1>
            <p className="text-[10px] text-[#808080] mb-8" style={FONT}>
              Power your mod creation
            </p>

            <div className="mc-panel inline-block px-6 py-4">
              <p className="text-[8px] text-[#808080] mb-2" style={FONT}>
                YOUR BALANCE
              </p>
              <div className="flex items-center justify-center gap-3">
                <span className="text-[28px] text-[#d4a017]" style={FONT}>
                  {loggedIn ? (profile?.token_balance ?? "...") : "—"}
                </span>
                <span className="text-[10px] text-[#808080]" style={FONT}>
                  tokens
                </span>
              </div>
              {isPaid && (
                <p className="text-[8px] text-[#55ff55] mt-2" style={FONT}>
                  {profile!.tier.toUpperCase()} • {profile!.billing_period}
                </p>
              )}
            </div>
          </section>

          {/* Pricing tiers */}
          <section className="mb-16">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className="mc-panel p-6 flex flex-col relative"
                  style={
                    plan.highlight
                      ? {
                          borderColor: "#d4a017",
                          boxShadow: "0 0 12px rgba(212, 160, 23, 0.25)",
                        }
                      : undefined
                  }
                >
                  {plan.badge && (
                    <div
                      className="absolute -top-[14px] left-1/2 -translate-x-1/2 px-3 py-1 text-[8px] text-[#0a0a0a] bg-[#d4a017]"
                      style={FONT}
                    >
                      {plan.badge}
                    </div>
                  )}

                  <h3
                    className="text-[14px] mb-4"
                    style={{ ...FONT, color: plan.color }}
                  >
                    {plan.name}
                  </h3>

                  <div className="mb-6">
                    <span className="text-[24px] text-[#c0c0c0]" style={FONT}>
                      {plan.price}
                    </span>
                    {plan.period && (
                      <span className="text-[10px] text-[#808080] ml-1" style={FONT}>
                        {plan.period}
                      </span>
                    )}
                  </div>

                  <ul className="flex-1 mb-6 space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2">
                        <span className="text-[10px] mt-[1px]" style={{ color: plan.color }}>
                          +
                        </span>
                        <span
                          className="text-[9px] text-[#c0c0c0] leading-relaxed"
                          style={FONT}
                        >
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {getPlanButton(plan)}
                </div>
              ))}
            </div>
          </section>

          {/* Earn free tokens — only for free users */}
          {!isPaid && (
            <section className="mb-16">
              <h2
                className="text-[16px] text-[#d4a017] text-center mb-8"
                style={FONT}
              >
                Earn Free Tokens
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {EARN_METHODS.map((method) => (
                  <div key={method.title} className="mc-panel p-4 flex flex-col">
                    <div
                      className="text-[20px] mb-3"
                      style={{ ...FONT, color: method.color }}
                    >
                      {method.reward}
                    </div>
                    <h3 className="text-[10px] text-[#c0c0c0] mb-2" style={FONT}>
                      {method.title}
                    </h3>
                    <p
                      className="text-[8px] text-[#808080] leading-relaxed flex-1 mb-4"
                      style={FONT}
                    >
                      {method.desc}
                    </p>
                    {method.button ? (
                      <button className="mc-btn w-full py-2 text-[9px]">
                        {method.button}
                      </button>
                    ) : (
                      <div
                        className="mc-panel-inset w-full py-2 text-center text-[9px] text-[#55ff55]"
                        style={FONT}
                      >
                        Auto-earned
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Token history */}
          <section>
            <h2
              className="text-[16px] text-[#d4a017] text-center mb-8"
              style={FONT}
            >
              Token History
            </h2>

            <div className="mc-panel overflow-hidden">
              <div
                className="grid grid-cols-3 gap-4 px-4 py-3 border-b-[3px]"
                style={{ borderColor: "#3d3d3d" }}
              >
                <span className="text-[9px] text-[#808080]" style={FONT}>Date</span>
                <span className="text-[9px] text-[#808080]" style={FONT}>Action</span>
                <span className="text-[9px] text-[#808080] text-right" style={FONT}>Tokens</span>
              </div>

              {!loggedIn ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[9px] text-[#808080]" style={FONT}>
                    Sign in to see your token history
                  </p>
                </div>
              ) : tokenHistory.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[9px] text-[#808080]" style={FONT}>
                    No transactions yet
                  </p>
                </div>
              ) : (
                tokenHistory.map((entry, i) => (
                  <div
                    key={entry.id}
                    className="grid grid-cols-3 gap-4 px-4 py-3"
                    style={
                      i < tokenHistory.length - 1
                        ? { borderBottom: "1px solid #1a1a1a" }
                        : undefined
                    }
                  >
                    <span className="text-[8px] text-[#808080]" style={FONT}>
                      {new Date(entry.created_at).toLocaleDateString()}
                    </span>
                    <span className="text-[8px] text-[#c0c0c0]" style={FONT}>
                      {REASON_LABELS[entry.reason] || entry.reason}
                    </span>
                    <span
                      className="text-[8px] text-right"
                      style={{ ...FONT, color: entry.amount > 0 ? "#55ff55" : "#ff5555" }}
                    >
                      {entry.amount > 0 ? `+${entry.amount}` : String(entry.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>
      </main>
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/app/pricing/page.tsx
git commit -m "feat: update pricing page with INR plans and DodoPayments checkout"
```

---

### Task 8: Environment Setup and Smoke Test

- [ ] **Step 1: Add DodoPayments env vars to backend .env**

Add to `backend/.env`:

```
DODO_PAYMENTS_API_KEY=<your-key>
DODO_PAYMENTS_WEBHOOK_KEY=<your-webhook-key>
DODO_PAYMENTS_ENVIRONMENT=test_mode
DODO_PRODUCT_BASIC_WEEKLY=<create-in-dashboard>
DODO_PRODUCT_BASIC_MONTHLY=<create-in-dashboard>
DODO_PRODUCT_UNLIMITED_MONTHLY=<create-in-dashboard>
```

- [ ] **Step 2: Install dependencies**

```bash
cd backend && pip install dodopayments==1.92.1
```

- [ ] **Step 3: Run the SQL migration**

Run `supabase/migration-003-subscriptions.sql` in Supabase SQL Editor.

- [ ] **Step 4: Start backend and verify endpoints exist**

```bash
cd backend && uvicorn main:app --reload --port 8000
```

Verify: `GET http://localhost:8000/docs` shows the new `/api/subscriptions/*` endpoints.

- [ ] **Step 5: Start frontend and verify pricing page loads**

```bash
cd frontend && npm run dev
```

Visit `http://localhost:3000/pricing` — should show 4 plan cards with INR pricing.

- [ ] **Step 6: Create DodoPayments products in dashboard**

Go to DodoPayments dashboard → Products → Create 3 subscription products:
1. Basic Weekly: ₹99, weekly billing
2. Basic Monthly: ₹399, monthly billing
3. Unlimited Monthly: ₹599, monthly billing

Copy the product IDs into your `.env` file.

- [ ] **Step 7: Test checkout flow end-to-end in test mode**

Click "Subscribe" on Basic Weekly → should redirect to DodoPayments test checkout → complete with test card → redirect back to `/pricing?success=true`.

- [ ] **Step 8: Configure webhook URL in DodoPayments dashboard**

Set webhook URL to: `https://<your-backend-url>/api/subscriptions/webhooks/dodo`

- [ ] **Step 9: Final commit**

```bash
git add -A
git commit -m "feat: complete DodoPayments subscription integration v0.2.0"
git tag -a v0.2.0 -m "v0.2.0 - Subscription payments via DodoPayments"
```
