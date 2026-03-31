# Changelog

All notable changes to ModCrafter will be documented in this file.

## [0.3.0] - 2026-03-31

### Added
- Texture preview system: generated item/block textures shown as base64 previews
- Loot reveal UI on status page with Minecraft-style enchantment shimmer animations
- Auth callback route (`/auth/callback`) for proper OAuth code exchange
- Marketplace mod detail modal with full info display
- Token balance display in header for logged-in users
- Token cost hint on home page
- Three new example prompts on home page
- `authChecked` guard to prevent flash of signup modal on page load

### Changed
- **Java edition no longer compiles on server** — mods packaged as Forge project ZIPs instead of JARs
- Removed JDK 17 from Docker image (significantly smaller image)
- Removed compile/fix iteration loop from agent
- Flattened token cost to 1 per generation (was 2 for Java)
- Download extension changed from `.jar` to `-forge-project.zip` for Java
- Auth redirects now go through `/auth/callback?next=` instead of direct page
- Meta description updated for Forge project output
- Job status model: removed `iteration`/`max_iterations`, added `texture_previews`
- Status page redesigned with step-by-step progress display

### Removed
- Server-side Gradle compilation (JDK, compile loop, error fixer)
- Mock data from `dummyResponses.ts` and `exploreData.ts` (replaced by real API)
- `MAX_FIX_ITERATIONS` and `BUILD_TIMEOUT_SECONDS` from render.yaml

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
