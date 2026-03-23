# MVP Design Spec — "Fix & Connect" (Approach A)

**Date**: 2026-03-24
**Goal**: Ship a working MVP that generates Minecraft mods via AI, with two model options, real auth, ad monetization, and PWA support.
**Timeline**: 5-6 days (adjusted after review)
**Strategy**: Keep all existing pages. Fix broken connections. Add new capabilities.

> **Review notes**: Spec reviewed 2026-03-24. Fixed: gallery API contract to match actual response format, model propagation strategy, auth validation approach (JWT decoding), Anthropic API format translation, /create chat architecture (async job flow), database migration for existing rows, and new package dependencies.

---

## 1. Architecture

```text
User → Next.js Frontend (all existing pages) → FastAPI Backend (direct calls via API_BASE)
                                                       ↓
                                                 Model Router
                                                /            \
                                       Groq                Anthropic
                                 (GPT-OSS 120B)        (Sonnet 4.6)
                                                       ↓
                                           Supabase (jobs, auth, storage)
```

**Tech Stack** (unchanged):

- Frontend: Next.js 16 + React 19 + TypeScript + Tailwind CSS 4
- Backend: FastAPI + Python 3.11
- Database: Supabase (PostgreSQL) + Supabase Storage
- AI: Groq (GPT-OSS 120B) + Anthropic (Sonnet 4.6)
- Build: Gradle 8 + Forge 1.20.1 (Java), JSON packaging (Bedrock)

**Note**: Frontend calls FastAPI backend directly (no Next.js API proxy routes). The existing `API_BASE` pattern is kept.

---

## 2. Changes — Prioritized

### 2.1 Backend Model Router (NEW)

**Purpose**: Abstract LLM calls so any service (parsing, code gen, texture gen, error fixing) can use either model.

**File**: `backend/services/model_router.py`

**Interface**:

```python
class ModelRouter:
    """Singleton replacing direct groq_client usage across all services."""

    async def chat_completion(
        self,
        messages: list[dict],
        model_preference: str,  # "gpt-oss-120b" | "sonnet-4.6"
        temperature: float = 0.3,
        max_tokens: int = 2048,
        json_mode: bool = False,
    ) -> str:
        """Route to Groq or Anthropic based on preference.

        Handles API format translation internally:
        - Groq: OpenAI-compatible (messages array, response_format for JSON)
        - Anthropic: separate system param, JSON via system prompt instruction
        Both return plain string content.
        """
```

**API format translation** (critical — Groq and Anthropic have different interfaces):

- **Groq (OpenAI-compatible)**: `messages` list with role/content, `response_format={"type": "json_object"}` for JSON mode
- **Anthropic**: `system` parameter extracted from messages, no `response_format` — JSON mode achieved via system prompt instruction ("Respond with valid JSON only"), response is `content[0].text`
- The router normalizes both into a simple `str` return value

**Model IDs**:

- Groq: `openai/gpt-oss-120b` (replaces existing `llama-3.3-70b-versatile` in config.py)
- Anthropic: `claude-sonnet-4-6`

**Propagation strategy**: The `ModelRouter` is instantiated as a singleton (like the existing `groq_client`). The model preference is stored on the job in Supabase when created, and passed through `run_agent_loop` to each service call. Each service function gains an optional `model_preference` parameter that defaults to `"gpt-oss-120b"`.

**Fallback behavior**: If chosen model fails after 3 retries, try the other model. Store `model_used` on the job (may differ from `model` requested if fallback occurred).

**Integration points** — all existing direct `groq_client` calls replaced:

- `prompts/parse_prompt.py` → `parse_mod_request()`
- `services/code_generator.py` → `generate_item_code()`, `generate_block_code()`
- `services/bedrock_generator.py` → `generate_bedrock_item()`, `generate_bedrock_entity()`
- `services/ai_texture_generator.py` → `generate_texture()`
- `services/error_fixer.py` → `fix_compilation_errors()`

**API change**: `POST /api/generate` request body adds `model` field:

```json
{
  "description": "A sword that shoots lightning",
  "mod_name": "Lightning Sword",
  "author_name": "Player",
  "edition": "java",
  "model": "gpt-oss-120b"
}
```

**New environment variables**:

```text
ANTHROPIC_API_KEY=sk-ant-...
```

**New Python dependencies**: `anthropic` (add to `requirements.txt`)

### 2.2 Wire `/create` Chat to Real Backend (FIX)

**Current state**: `frontend/src/app/create/page.tsx` uses `dummyResponses.ts` — `findResponse()` returns synchronous `ItemData[]` with hardcoded stats. This is a fundamentally different pattern from the real backend (async job submission + polling).

**Architecture change** — new message types in chat:

- `user` — user's text message (existing)
- `assistant-text` — AI text response (existing)
- `generation-started` — shows "Generating your mod..." with progress bar, polls `/api/status/{jobId}`
- `generation-complete` — shows mod name, description, download button, model used badge
- `generation-failed` — shows error message with retry button

**Chat flow**:

1. User describes mod in chat input
2. Frontend calls `POST /api/generate` with description + selected model
3. New `generation-started` message appears with animated progress (polls status every 2.5s)
4. On completion: `generation-complete` message replaces progress with download button
5. On failure: `generation-failed` message with error and retry option

**Existing `ItemCard` component**: Repurposed to show real mod results (name, description, edition, download link) instead of mock item stats. The current `ItemData` interface is replaced with `GeneratedMod` interface matching the status API response.

**Files to modify**:

- `frontend/src/app/create/page.tsx` — new message types, real API integration
- `frontend/src/components/ChatInterface.tsx` — remove `findResponse()`, add job polling
- `frontend/src/lib/api.ts` — add model parameter to generate call
- `frontend/src/app/create/dummyResponses.ts` — keep file, stop importing

### 2.3 Wire `/gallery` to Real API (FIX)

**Current state**: Uses `exploreData.ts` mock data alongside real API calls.

**Fix**: Remove mock data usage, use only `/api/gallery` endpoint.

**Actual API response format** (matching existing `gallery.py` lines 42-56):

```json
{
  "mods": [
    {
      "id": "uuid",
      "name": "Storm Blade",
      "description": "A diamond katana that summons lightning",
      "author": "Player",
      "edition": "java",
      "created_at": "2026-03-24T...",
      "download_url": "https://...",
      "model_used": "gpt-oss-120b"
    }
  ],
  "total": 42
}
```

**Note**: Field names are `name` (not `mod_name`), `download_url` (not `jar_file_url`), `author` (not `author_name`) — these are transformed in the gallery router.

**Known limitation**: `total` currently returns page count, not total count. Pagination will be inaccurate. Acceptable for MVP; fix post-launch with Supabase `count` option.

**Files to modify**:

- `frontend/src/app/gallery/page.tsx` — remove mock data imports, use real API only
- `frontend/src/lib/api.ts` — ensure gallery fetch types match actual response

### 2.4 Model Toggle on Frontend (NEW)

**Location**: Home page (`/`) and Create page (`/create`)

**UI**: Segmented toggle near the prompt input:

```text
[GPT-OSS 120B (Fast)]  [Sonnet 4.6 (Quality)]
```

**Behavior**:

- Default: GPT-OSS 120B (free, fast)
- Selection persisted in localStorage
- Passed to backend in generate request
- Visual badge on status page showing which model is generating

### 2.5 Supabase Auth (NEW)

**Current state**: `isSignedUp()` checks localStorage for email string. No real auth.

**Implementation**:

- Use Supabase Auth (built-in with their JS SDK)
- Sign up methods: Email/password + Google OAuth
- Auth state managed via Supabase `onAuthStateChange`
- Protected routes: `/create`, `/status/*` require auth
- Gallery remains public (for SEO + ad impressions)
- Replace signup modal with real auth modal

**Backend auth validation approach**: FastAPI dependency that:

1. Extracts `Authorization: Bearer <token>` header
2. Decodes the Supabase JWT using `SUPABASE_JWT_SECRET` env var
3. Returns `user_id` or raises 401
4. Applied as dependency on `/api/generate` and `/api/edit` routes
5. Gallery and status endpoints remain public

**Database changes**:

- Add `user_id` column to `jobs` table — `UUID REFERENCES auth.users(id)`, **nullable** (existing rows have NULL)
- Add `model_used` column to `jobs` table — `TEXT DEFAULT 'gpt-oss-120b'`
- Update RLS policies:
  - Gallery SELECT: public (anyone can browse)
  - INSERT: require `auth.uid()` matches `user_id`
  - UPDATE: require `auth.uid()` matches `user_id`
  - SELECT own jobs: `auth.uid() = user_id` for status page

**Migration for existing data**: Existing jobs keep `user_id = NULL` and `model_used = 'gpt-oss-120b'`. No backfill needed.

**New frontend dependency**: `@supabase/supabase-js`

**New environment variables**:

```text
SUPABASE_JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Files to modify**:

- `frontend/src/components/SignupModal.tsx` → real auth flow
- `frontend/src/lib/api.ts` → attach auth token to requests
- `frontend/src/lib/supabase.ts` → new Supabase client init
- `backend/routers/generate.py` → auth dependency
- `backend/utils/auth.py` → new JWT validation dependency
- `supabase/schema.sql` → add columns, update RLS

### 2.6 Ad Placements (NEW)

**Provider**: Google AdSense

**Placement slots**:

1. **Home page**: Banner below hero section
2. **Gallery**: Between every 4th mod card (native-feeling)
3. **Status page**: Banner while user waits for generation (high dwell time)
4. **Create page**: Small banner at bottom

**Implementation**:

- Create `AdBanner` component that loads AdSense script
- Responsive ad units (auto-size)
- No ads for authenticated Pro users (future)

**Files**:

- `frontend/src/components/AdBanner.tsx` (new)
- Insert into page layouts

### 2.7 PWA Support (NEW)

**Files**:

- `frontend/public/manifest.json` — app name, icons, theme color, display: standalone
- `frontend/public/sw.js` — basic service worker (cache static assets, network-first for API)
- `frontend/src/app/layout.tsx` — link manifest, register SW

**Manifest**:

```json
{
  "name": "MinecraftModCreator",
  "short_name": "ModCreator",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#00ff88",
  "icons": []
}
```

---

## 3. Pages — Final State After MVP

| Page | State | Notes |
| --- | --- | --- |
| `/` (Home) | **Enhanced** | + model toggle, + ad banner, + real auth |
| `/create` | **Fixed** | Connected to real backend, model toggle, async job flow |
| `/create/skins` | Unchanged | Placeholder, kept for future |
| `/status/[jobId]` | **Enhanced** | + model indicator, + ad slot |
| `/gallery` | **Fixed** | Real API data, + ad slots between cards |
| `/gallery/marketplace` | Unchanged | Placeholder, kept for future |
| `/gallery/admin` | Unchanged | Placeholder, kept for future |
| `/pricing` | Unchanged | Placeholder, kept for future |

---

## 4. API Contracts

### POST /api/generate (enhanced)

```json
// Request
{
  "description": "A diamond katana that summons lightning",
  "mod_name": "Storm Blade",
  "author_name": "Player",
  "edition": "java",
  "model": "gpt-oss-120b"
}

// Response
{ "job_id": "uuid-string" }
```

### GET /api/status/{job_id} (enhanced)

```json
{
  "status": "generating",
  "progress_message": "Generating item code...",
  "iteration": 1,
  "download_ready": false,
  "jar_url": null,
  "model_used": "gpt-oss-120b",
  "error": null
}
```

### GET /api/gallery (enhanced)

```json
{
  "mods": [
    {
      "id": "uuid",
      "name": "Storm Blade",
      "description": "A diamond katana...",
      "author": "Player",
      "edition": "java",
      "created_at": "2026-03-24T...",
      "download_url": "https://...",
      "model_used": "gpt-oss-120b"
    }
  ],
  "total": 42
}
```

---

## 5. Environment Variables (Complete)

```text
# Existing
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...

# New
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_JWT_SECRET=your-jwt-secret
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-...
```

---

## 6. New Dependencies

**Frontend** (`package.json`):

- `@supabase/supabase-js` — auth + realtime client

**Backend** (`requirements.txt`):

- `anthropic` — Anthropic API client for Sonnet 4.6
- `PyJWT` — JWT decoding for auth validation

---

## 7. Out of Scope (Post-MVP)

- Token/credit system
- Skin creator functionality
- Marketplace buying/selling
- Admin dashboard
- Mod editing/remixing (backend has edit endpoint, but not wired to frontend UX)
- Multi-user collaboration
- Launcher integration
- 3D model editor (Blockbench-style)
- Gallery pagination fix (total count)
- Windows temp dir fix (`/tmp/modcreator` → cross-platform)

---

## 8. Success Criteria

MVP is done when:

1. User can sign up with real email/password or Google
2. User can describe a mod, pick a model, and get a working .jar or .mcaddon
3. User can toggle between GPT-OSS 120B and Sonnet 4.6
4. Gallery shows real community-generated mods
5. `/create` chat generates real mods (not dummy data)
6. Ads display on key pages
7. App is installable as PWA on mobile
8. All existing pages remain accessible (no regressions)
