# MVP Design Spec — "Fix & Connect" (Approach A)

**Date**: 2026-03-24
**Goal**: Ship a working MVP that generates Minecraft mods via AI, with two model options, real auth, ad monetization, and PWA support.
**Timeline**: 4-5 days
**Strategy**: Keep all existing pages. Fix broken connections. Add new capabilities.

---

## 1. Architecture

```
User → Next.js Frontend (all existing pages) → Next.js API routes (proxy) → FastAPI Backend
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

---

## 2. Changes — Prioritized

### 2.1 Backend Model Router (NEW)

**Purpose**: Abstract LLM calls so any service (parsing, code gen, texture gen, error fixing) can use either model.

**File**: `backend/services/model_router.py`

**Interface**:
```python
class ModelRouter:
    async def chat_completion(
        self,
        messages: list[dict],
        model_preference: str,  # "gpt-oss-120b" | "sonnet-4.6"
        temperature: float = 0.3,
        max_tokens: int = 2048,
        response_format: dict | None = None,  # JSON mode
    ) -> str:
        """Route to Groq or Anthropic based on preference."""
```

**Behavior**:
- `gpt-oss-120b` → Groq API (`openai/gpt-oss-120b` model ID)
- `sonnet-4.6` → Anthropic API (`claude-sonnet-4-6` model ID)
- Retry logic: 3 attempts with exponential backoff (reuse existing Groq retry pattern)
- Fallback: If chosen model fails after retries, try the other model before giving up

**Integration points** — all existing LLM calls go through router:
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
  "model": "gpt-oss-120b"  // NEW — default: "gpt-oss-120b"
}
```

**Environment variables** (new):
```
ANTHROPIC_API_KEY=sk-ant-...
# GROQ_API_KEY already exists
```

### 2.2 Wire `/create` Chat to Real Backend (FIX)

**Current state**: `frontend/src/app/create/page.tsx` uses `dummyResponses.ts` — returns hardcoded item data based on keyword matching.

**Fix**:
- Replace dummy response logic with real API call to `POST /api/generate`
- Chat flow:
  1. User describes mod in chat
  2. Frontend sends to backend with selected model
  3. Show generation progress inline (poll `/api/status/{jobId}`)
  4. Display result with download button in chat
- Keep the existing chat UI components (message bubbles, input, category dropdown)
- Category dropdown maps to backend: Items, Mobs, Structures → inform the description prompt

**Files to modify**:
- `frontend/src/app/create/page.tsx` — replace dummy call with real API
- `frontend/src/lib/api.ts` — add model parameter to generate call
- `frontend/src/app/create/dummyResponses.ts` — keep file but stop importing it

### 2.3 Wire `/gallery` to Real API (FIX)

**Current state**: Uses `exploreData.ts` mock data alongside real API calls.

**Fix**:
- Remove mock data usage, use only `/api/gallery` endpoint
- The endpoint already works and returns completed mods
- Ensure mod cards show: name, description, edition badge, download count, download button
- Keep existing filter UI (edition, sort)

**Files to modify**:
- `frontend/src/app/gallery/page.tsx` — remove mock data imports, use real API only
- `frontend/src/lib/api.ts` — ensure gallery fetch is properly typed

### 2.4 Model Toggle on Frontend (NEW)

**Location**: Home page (`/`) and Create page (`/create`)

**UI**: Simple toggle/dropdown near the prompt input:
```
[⚡ GPT-OSS 120B (Fast)]  [🧠 Sonnet 4.6 (Quality)]
```

**Behavior**:
- Default: GPT-OSS 120B (free, fast)
- Selection persisted in localStorage
- Passed to backend in generate request
- Visual indicator on status page showing which model is generating

### 2.5 Supabase Auth (NEW)

**Current state**: `isSignedUp()` checks localStorage for email string. No real auth.

**Implementation**:
- Use Supabase Auth (built-in with their JS SDK)
- Sign up methods: Email/password + Google OAuth
- Auth state managed via Supabase `onAuthStateChange`
- Protected routes: `/create`, `/status/*` require auth
- Gallery remains public (for SEO + ad impressions)
- Replace signup modal with real auth modal

**Database changes**:
- Add `user_id` column to `jobs` table (FK to auth.users)
- Users can see their own mod history

**Files to modify**:
- `frontend/src/components/SignupModal.tsx` → real auth flow
- `frontend/src/lib/api.ts` → attach auth token to requests
- `backend/routers/generate.py` → validate auth token
- `supabase/schema.sql` → add user_id to jobs, update RLS policies

### 2.6 Ad Placements (NEW)

**Provider**: Google AdSense

**Placement slots**:
1. **Home page**: Banner below hero section
2. **Gallery**: Between every 4th mod card (native-feeling)
3. **Status page**: Sidebar/banner while user waits for generation (high dwell time = good for ads)
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
  "icons": [...]
}
```

---

## 3. Pages — Final State After MVP

| Page | State | Notes |
|------|-------|-------|
| `/` (Home) | **Enhanced** | + model toggle, + ad banner, + real auth |
| `/create` | **Fixed** | Connected to real backend, model toggle |
| `/create/skins` | Unchanged | Placeholder, kept for future |
| `/status/[jobId]` | **Enhanced** | + model indicator, + ad slot |
| `/gallery` | **Fixed** | Real API data, + ad slots between cards |
| `/gallery/marketplace` | Unchanged | Placeholder, kept for future |
| `/gallery/admin` | Unchanged | Placeholder, kept for future |
| `/pricing` | Unchanged | Placeholder, kept for future |

---

## 4. API Contracts

### POST /api/generate (updated)
```json
// Request
{
  "description": "A diamond katana that summons lightning",
  "mod_name": "Storm Blade",        // optional
  "author_name": "Player",          // optional, from auth
  "edition": "java",                // "java" | "bedrock"
  "model": "gpt-oss-120b"           // "gpt-oss-120b" | "sonnet-4.6"
}

// Response
{ "job_id": "uuid-string" }
```

### GET /api/status/{job_id} (unchanged)
```json
{
  "status": "generating",
  "progress_message": "Generating item code...",
  "iteration": 1,
  "download_ready": false,
  "jar_url": null,
  "model_used": "gpt-oss-120b",     // NEW
  "error": null
}
```

### GET /api/gallery (unchanged)
```json
[
  {
    "id": "uuid",
    "mod_name": "Storm Blade",
    "description": "...",
    "edition": "java",
    "created_at": "2026-03-24T...",
    "jar_file_url": "https://...",
    "model_used": "gpt-oss-120b"    // NEW
  }
]
```

---

## 5. Environment Variables (Complete)

```env
# Existing
GROQ_API_KEY=gsk_...
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...

# New
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-...
```

---

## 6. Out of Scope (Post-MVP)

- Token/credit system
- Skin creator functionality
- Marketplace buying/selling
- Admin dashboard
- Mod editing/remixing (backend has edit endpoint, but not wired to frontend UX)
- Multi-user collaboration
- Launcher integration
- 3D model editor (Blockbench-style)

---

## 7. Success Criteria

MVP is done when:
1. User can sign up with real email/password or Google
2. User can describe a mod, pick a model, and get a working .jar or .mcaddon
3. User can toggle between GPT-OSS 120B and Sonnet 4.6
4. Gallery shows real community-generated mods
5. `/create` chat generates real mods (not dummy data)
6. Ads display on key pages
7. App is installable as PWA on mobile
8. All existing pages remain accessible (no regressions)
