# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ModCrafter — AI-powered Minecraft mod generator (Java Forge + Bedrock). Full-stack app: Next.js frontend + FastAPI backend, Supabase for auth/DB/storage, DodoPayments for INR subscriptions.

## Development Commands

### Frontend (`/frontend`)
```bash
cd frontend && npm run dev      # Dev server on :3000
cd frontend && npm run build    # Production build
```

### Backend (`/backend`)
```bash
cd backend && uvicorn main:app --reload   # Dev server on :8000
```

### Docker (backend only)
```bash
docker build -t modcrafter-backend .
docker run -p 8000:8000 --env-file backend/.env modcrafter-backend
```

No test suite or linter configured yet.

## Architecture

### Two-Service Split
- **Frontend** (`/frontend`): Next.js 16 App Router, Tailwind CSS 4, Supabase JS SDK for auth
- **Backend** (`/backend`): FastAPI, Supabase Python SDK (service role), Groq + Anthropic LLM clients

### Generation Pipeline (`backend/services/agent_loop.py`)
The core workflow runs as a background task per job:
1. **Parse** — LLM converts user prompt → `ModSpec` (items, blocks, recipes) via `mod_request_parser.py`
2. **Enrich** — `mechanics_engine.py` adds game mechanics to items
3. **Generate Code** — `code_generator.py` (Java) or `bedrock_generator.py` (Bedrock JSON)
4. **Generate Textures** — `ai_texture_generator.py` with `procedural_textures.py` fallback
5. **Assemble** — `mod_assembler.py` / `bedrock_assembler.py` builds project structure
6. **Package** — ZIP (Java Forge project) or MCADDON (Bedrock)
7. **Upload** — Supabase Storage `mod-jars` bucket, signed download URLs

Java mods are **not compiled on server** (v0.3+). Users get a Forge project ZIP to build locally.

### Model Routing
Two LLM providers available, user-selectable from the frontend:
- **Groq** — GPT-OSS 120B (default, cheaper)
- **Anthropic** — Claude Sonnet 4.6
Routing logic in `backend/services/model_router.py`.

### Token Economy
- Free tier: 5 tokens, 1 token per generation, 10 jobs/day rate limit
- Paid tiers via DodoPayments (INR): Basic Weekly ₹99, Basic Monthly ₹399, Unlimited ₹599/mo
- Token deduction + audit log in `token_transactions` table

### Authentication Flow
- Supabase Auth (email/password + Google OAuth)
- Frontend: `supabase.auth.onAuthStateChange()` → Bearer token in API calls
- Backend: `utils/auth.py` validates JWT via `supabase.auth.get_user()` as FastAPI dependency
- OAuth callback handled at `/auth/callback?next=`

### Database (Supabase PostgreSQL)
Schema in `/supabase/schema.sql` with migrations in `/supabase/migration-00*.sql`.
Key tables: `jobs` (generation tracking), `user_profiles` (tokens + subscription), `token_transactions` (audit).
RLS enabled on user-facing tables.

### Frontend Theme
Minecraft pixel-art aesthetic: Press Start 2P / VT323 fonts, gold accent (#d4a017), dark backgrounds, 3D beveled panels. Custom CSS classes: `.mc-panel`, `.mc-btn`, `.enchant-glint`. Animations defined in `globals.css`.

## API Route Structure

All backend routes prefixed with `/api`:
- `/api/generate`, `/api/status/{job_id}`, `/api/edit/{job_id}`, `/api/download/{job_id}` — Generation
- `/api/user/profile`, `/api/user/tokens/history` — User data
- `/api/gallery`, `/api/gallery/my-mods` — Gallery
- `/api/browse/search` — Modrinth/CurseForge search proxy
- `/api/subscriptions/checkout`, `/api/subscriptions/status`, `/api/subscriptions/cancel`, `/api/subscriptions/webhook` — Payments
- `/api/skins/generate` — AI skin generation (64x64 PNG)
- `/health` — Health check

## Deployment

- **Frontend**: Vercel (auto-deploy, config in `vercel.json`)
- **Backend**: Render (Docker, config in `render.yaml`)
- **Database/Storage**: Supabase Cloud

## Key Constraints

- Backend uses service-role Supabase key (full DB access) — never expose to frontend
- Frontend only uses anon key via `NEXT_PUBLIC_SUPABASE_*` env vars
- Texture generation has AI path (Groq vision) with procedural pixel-art fallback
- Job status polling from frontend — no WebSocket/SSE, uses `GET /api/status/{job_id}`
- Max file upload to Supabase Storage: 52MB
