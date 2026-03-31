# Changelog

All notable changes to ModCrafter will be documented in this file.

## [0.2.0] - 2026-03-31

### Added
- DodoPayments subscription integration (checkout, webhooks, cancel)
- Subscription plans: Basic Weekly (₹99), Basic Monthly (₹399), Unlimited (₹599/mo)
- Webhook handler for subscription lifecycle (active, renewed, on_hold, failed)
- Subscription status and cancel endpoints
- User profile now returns subscription info
- Frontend pricing page with INR plans and real checkout flow
- Success banner after payment redirect
- Cancel subscription button for active subscribers
- Database migration for subscription columns on user_profiles
- SQL RPC function for scalable email-based user lookup

### Changed
- Pricing page: USD → INR, 3 plans → 4 plans (Free, Basic Weekly, Basic Monthly, Unlimited)
- "Earn Free Tokens" section hidden for paid subscribers
- Cancel keeps access until billing period ends (was: immediate downgrade)

### Security
- Webhook signature verification rejects when signing key is unconfigured

## [0.1.0] - 2026-03-29

### Added
- AI-powered Minecraft mod generation (Bedrock + Java editions)
- GPT-OSS 120B and Sonnet 4.6 model support
- Supabase auth (email/password + Google OAuth)
- Token system (5 free/day, deduction on generation)
- Public mod gallery with sort/filter
- My Mods personal library
- Mod browsing via Modrinth API
- Google AdSense ad placements
- PWA support (manifest + service worker)
- Pixel-art Minecraft theme (Press Start 2P, VT323 fonts)
- Rate limiting (10 mods/day)
- Vercel frontend + VPS backend deployment
