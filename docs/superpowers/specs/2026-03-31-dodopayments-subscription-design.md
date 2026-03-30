# DodoPayments Subscription Integration Design

**Date:** 2026-03-31
**Status:** Approved

## Overview

Integrate DodoPayments as the payment gateway for recurring subscriptions. Replace the placeholder USD pricing with INR-based plans. DodoPayments handles currency conversion for international users at checkout.

## Subscription Plans

| Plan | Price | Billing | Tokens | Ads | Tier DB value |
|------|-------|---------|--------|-----|---------------|
| Free | ₹0 | — | 5/day (auto-refill) | Yes | `free` |
| Basic Weekly | ₹99 | Weekly | 600/period | No | `basic` |
| Basic Monthly | ₹399 | Monthly | 600/period | No | `basic` |
| Unlimited | ₹599 | Monthly | Unlimited | No | `unlimited` |

- 1 Bedrock mod = 1 token, 1 Java mod = 2 tokens
- Basic tier gets 600 tokens per billing period (week or month)
- Token balance resets on each renewal (not cumulative)
- Unlimited tier skips token checks entirely (already implemented)

## Architecture

### Flow: User subscribes

```
Frontend (Pricing Page)
  → Click "Subscribe" on a plan
  → POST /api/subscriptions/checkout { product_id, billing_period }
  → Backend creates DodoPayments checkout session
  → Returns checkout_url
  → Frontend redirects to DodoPayments hosted checkout
  → User pays
  → DodoPayments redirects to /pricing?success=true
  → DodoPayments fires webhook → POST /api/webhooks/dodo
  → Backend updates user_profiles.tier + token_balance
```

### Flow: Subscription renews

```
DodoPayments auto-charges
  → webhook: subscription.renewed + payment.succeeded
  → Backend resets token_balance to 600 (basic) or leaves as-is (unlimited)
  → Logs token_transaction with reason "subscription_renewal"
```

### Flow: Subscription fails / on_hold

```
DodoPayments charge fails
  → webhook: subscription.on_hold + payment.failed
  → Backend downgrades user to free tier
  → Sends notification (future: email)
```

## Backend Changes

### New file: `backend/routers/subscriptions.py`

Endpoints:
- `POST /api/subscriptions/checkout` — Create checkout session, return URL
- `POST /api/webhooks/dodo` — Receive DodoPayments webhooks
- `GET /api/subscriptions/status` — Get user's current subscription info
- `POST /api/subscriptions/cancel` — Cancel subscription via API

### New file: `backend/services/dodo_payments.py`

Service layer wrapping the `dodopayments` Python SDK:
- `create_checkout_session(user_id, product_id, customer_email)`
- `cancel_subscription(subscription_id)`
- `get_subscription(subscription_id)`

### Database changes: `supabase/schema.sql`

Add to `user_profiles`:
- `subscription_id TEXT` — DodoPayments subscription ID
- `subscription_status TEXT DEFAULT 'none'` — none/active/on_hold/cancelled
- `billing_period TEXT` — weekly/monthly
- `subscription_expires_at TIMESTAMPTZ` — when current period ends

Update tier enum to include `basic` (currently only free/pro/unlimited).

Add new `token_transactions` reason values: `subscription_purchase`, `subscription_renewal`, `subscription_cancelled`.

### Environment variables

```
DODO_PAYMENTS_API_KEY=<secret>
DODO_PAYMENTS_WEBHOOK_KEY=<secret>
DODO_PAYMENTS_ENVIRONMENT=test_mode  # or live_mode
```

### Config changes: `backend/config.py`

Add DodoPayments settings fields.

## Frontend Changes

### Update: `frontend/src/app/pricing/page.tsx`

- Replace USD prices with INR (₹99/week, ₹399/month, ₹599/month)
- Add Basic Weekly / Basic Monthly / Unlimited as selectable options
- "Subscribe" button calls `/api/subscriptions/checkout` and redirects
- Show current subscription status for logged-in users
- Handle `?success=true` query param to show success message
- Hide ads section for subscribed users

### Update: Ad visibility

- Check user tier before showing ads throughout the app
- Free tier: show ads
- Basic/Unlimited: hide ads

## DodoPayments Product Setup

Create 3 subscription products in DodoPayments dashboard:
1. **Basic Weekly** — ₹99, weekly recurring
2. **Basic Monthly** — ₹399, monthly recurring
3. **Unlimited Monthly** — ₹599, monthly recurring

Store product IDs in backend config (env vars or config.py).

## Webhook Events to Handle

| Event | Action |
|-------|--------|
| `subscription.active` | Set tier to basic/unlimited, grant tokens, store subscription_id |
| `subscription.renewed` | Reset token_balance to 600 (basic) or no-op (unlimited) |
| `subscription.on_hold` | Downgrade to free tier, notify user |
| `subscription.failed` | Downgrade to free tier |
| `payment.succeeded` | Log transaction |
| `payment.failed` | Log transaction |

## Security

- Webhook signature verification using DODO_PAYMENTS_WEBHOOK_KEY
- API key stored as environment variable, never in code
- Checkout sessions created server-side only
- User can only access their own subscription data

## Out of Scope (for now)

- Email notifications on subscription events
- Proration for mid-cycle plan changes
- Refund handling
- Admin dashboard for subscription management
- Customer portal (DodoPayments provides one, can link later)
