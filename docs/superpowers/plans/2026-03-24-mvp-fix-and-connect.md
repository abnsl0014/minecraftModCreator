# MVP "Fix & Connect" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working MVP — AI mod generation with model toggle (GPT-OSS 120B / Sonnet 4.6), real auth, gallery wired to API, /create chat wired to backend, ad placements, and PWA.

**Architecture:** FastAPI backend with a new ModelRouter singleton that wraps both Groq (GPT-OSS 120B) and Anthropic (Sonnet 4.6) behind the existing `chat()` interface. Model preference flows from frontend -> generate request -> job record -> agent_loop -> each service call. Frontend uses Supabase Auth replacing the localStorage hack, with protected routes for generation.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS 4, FastAPI, Python 3.11, Supabase (auth + DB + storage), Groq API, Anthropic API, Google AdSense.

**Spec:** `docs/superpowers/specs/2026-03-24-mvp-fix-and-connect-design.md`

---

## File Structure

### New Files

| File | Responsibility |
| --- | --- |
| `backend/services/model_router.py` | LLM abstraction — routes to Groq or Anthropic |
| `backend/utils/auth.py` | FastAPI dependency for JWT validation |
| `frontend/src/lib/supabase.ts` | Supabase client initialization |
| `frontend/src/components/AdBanner.tsx` | Google AdSense ad component |
| `frontend/public/manifest.json` | PWA manifest |
| `frontend/public/sw.js` | Service worker |
| `supabase/migration-001-mvp.sql` | DB migration (user_id, model_used columns) |

### Modified Files

| File | Changes |
| --- | --- |
| `backend/config.py` | Add `anthropic_api_key`, `supabase_jwt_secret`, update model ID |
| `backend/requirements.txt` | Add `anthropic`, `PyJWT` |
| `backend/utils/groq_client.py` | Update model to `openai/gpt-oss-120b` |
| `backend/services/mod_request_parser.py` | Use model_router instead of groq_client |
| `backend/services/code_generator.py` | Use model_router instead of groq_client |
| `backend/services/bedrock_generator.py` | Use model_router instead of groq_client |
| `backend/services/ai_texture_generator.py` | Use model_router instead of groq_client |
| `backend/services/error_fixer.py` | Use model_router instead of groq_client |
| `backend/services/edit_handler.py` | Use model_router instead of groq_client |
| `backend/services/agent_loop.py` | Thread model_preference through all calls |
| `backend/services/job_manager.py` | Add `user_id`, `model_used` to create/update |
| `backend/models.py` | Add `model` field to `GenerateRequest` |
| `backend/routers/generate.py` | Pass model to create_job, add auth dependency |
| `backend/routers/gallery.py` | Add `model_used` to select/transform |
| `frontend/package.json` | Add `@supabase/supabase-js` |
| `frontend/src/lib/api.ts` | Add model param, auth token headers |
| `frontend/src/components/ChatInterface.tsx` | Replace dummy responses with real API |
| `frontend/src/components/SignupModal.tsx` | Real Supabase auth flow |
| `frontend/src/app/gallery/page.tsx` | Remove mock data, use real API |
| `frontend/src/app/layout.tsx` | Add PWA manifest link, register SW |
| `frontend/src/app/page.tsx` | Add model toggle, ad banner |
| `frontend/src/app/status/[jobId]/page.tsx` | Show model badge, ad slot |

---

## Task 1: Backend Model Router

**Files:**

- Create: `backend/services/model_router.py`
- Modify: `backend/config.py`
- Modify: `backend/requirements.txt`

- [ ] **Step 1: Add new dependencies to requirements.txt**

Append to `backend/requirements.txt`:

```text
anthropic==0.52.0
PyJWT==2.9.0
```

- [ ] **Step 2: Update config.py with new settings**

Add to the `Settings` class in `backend/config.py`:

```python
class Settings(BaseSettings):
    groq_api_key: str
    groq_model: str = "openai/gpt-oss-120b"  # Changed from llama-3.3-70b-versatile
    anthropic_api_key: str = ""  # Optional — only needed for Sonnet toggle
    anthropic_model: str = "claude-sonnet-4-6"
    supabase_url: str
    supabase_key: str
    supabase_jwt_secret: str = ""  # For auth token validation
    mod_template_dir: str = "../mod-template"
    temp_dir_base: str = "/tmp/modcreator"
    max_fix_iterations: int = 3
    build_timeout_seconds: int = 300

    class Config:
        env_file = ".env"
```

- [ ] **Step 3: Create model_router.py**

Create `backend/services/model_router.py`:

```python
"""
Model Router — abstracts LLM calls behind a unified interface.
Routes to Groq (GPT-OSS 120B) or Anthropic (Sonnet 4.6) based on preference.
Drop-in replacement for groq_client.chat() across all services.
"""
import logging
import asyncio
from typing import List, Dict, Optional

from groq import AsyncGroq, RateLimitError as GroqRateLimitError
from anthropic import AsyncAnthropic, RateLimitError as AnthropicRateLimitError
from config import settings

logger = logging.getLogger(__name__)

GROQ_MODEL = "gpt-oss-120b"
SONNET_MODEL = "sonnet-4.6"


class ModelRouter:
    def __init__(self):
        self.groq_client = AsyncGroq(api_key=settings.groq_api_key)
        self.anthropic_client = (
            AsyncAnthropic(api_key=settings.anthropic_api_key)
            if settings.anthropic_api_key
            else None
        )

    async def chat(
        self,
        messages: List[Dict],
        model_preference: str = GROQ_MODEL,
        temperature: float = 0.3,
        max_tokens: int = 4096,
        json_mode: bool = False,
    ) -> str:
        """
        Unified LLM call. Same interface as existing GroqClient.chat().
        Routes to Groq or Anthropic, with fallback on failure.
        """
        primary = model_preference
        fallback = SONNET_MODEL if primary == GROQ_MODEL else GROQ_MODEL

        try:
            return await self._call(primary, messages, temperature, max_tokens, json_mode)
        except Exception as e:
            logger.warning(f"Primary model {primary} failed: {e}. Trying fallback {fallback}.")
            return await self._call(fallback, messages, temperature, max_tokens, json_mode)

    async def _call(
        self,
        model: str,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
    ) -> str:
        if model == SONNET_MODEL:
            return await self._call_anthropic(messages, temperature, max_tokens, json_mode)
        else:
            return await self._call_groq(messages, temperature, max_tokens, json_mode)

    async def _call_groq(
        self,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
        max_retries: int = 6,
    ) -> str:
        """Call Groq API with retry logic (ported from existing groq_client.py)."""
        kwargs = {
            "model": settings.groq_model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens,
        }
        if json_mode:
            kwargs["response_format"] = {"type": "json_object"}

        for attempt in range(max_retries):
            try:
                response = await self.groq_client.chat.completions.create(**kwargs)
                return response.choices[0].message.content
            except GroqRateLimitError:
                wait = min(2 ** attempt * 5, 60)
                logger.info(f"Groq rate limited, waiting {wait}s (attempt {attempt + 1})")
                await asyncio.sleep(wait)
        raise RuntimeError("Groq API failed after max retries")

    async def _call_anthropic(
        self,
        messages: List[Dict],
        temperature: float,
        max_tokens: int,
        json_mode: bool,
        max_retries: int = 3,
    ) -> str:
        """Call Anthropic API, translating from OpenAI message format."""
        if not self.anthropic_client:
            raise RuntimeError("Anthropic API key not configured")

        # Extract system message (Anthropic uses separate system param)
        system_msg = ""
        user_messages = []
        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                user_messages.append(msg)

        # JSON mode: add instruction to system prompt
        if json_mode and system_msg:
            system_msg += "\n\nIMPORTANT: Respond with valid JSON only. No markdown, no explanation."
        elif json_mode:
            system_msg = "Respond with valid JSON only. No markdown, no explanation."

        for attempt in range(max_retries):
            try:
                response = await self.anthropic_client.messages.create(
                    model=settings.anthropic_model,
                    system=system_msg,
                    messages=user_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.content[0].text
            except AnthropicRateLimitError:
                wait = min(2 ** attempt * 5, 30)
                logger.info(f"Anthropic rate limited, waiting {wait}s (attempt {attempt + 1})")
                await asyncio.sleep(wait)
        raise RuntimeError("Anthropic API failed after max retries")


# Singleton — replaces groq_client across all services
model_router = ModelRouter()
```

- [ ] **Step 4: Commit**

```bash
git add backend/services/model_router.py backend/config.py backend/requirements.txt
git commit -m "feat: add model router for GPT-OSS 120B / Sonnet 4.6 toggle"
```

---

## Task 2: Replace groq_client with model_router in all services

**Files:**

- Modify: `backend/services/mod_request_parser.py`
- Modify: `backend/services/code_generator.py`
- Modify: `backend/services/bedrock_generator.py`
- Modify: `backend/services/ai_texture_generator.py`
- Modify: `backend/services/error_fixer.py`
- Modify: `backend/services/edit_handler.py`

- [ ] **Step 1: Update mod_request_parser.py**

Replace import and all `groq_client.chat(...)` calls:

```python
# OLD:
from utils.groq_client import groq_client

# NEW:
from services.model_router import model_router, GROQ_MODEL
```

Every function that calls `groq_client.chat(...)` gets an additional `model_preference: str = GROQ_MODEL` parameter, and the call changes from `groq_client.chat(...)` to `model_router.chat(..., model_preference=model_preference)`.

Example in `parse_mod_request()`:

```python
# OLD:
async def parse_mod_request(description: str, mod_name: Optional[str] = None) -> ModSpec:
    response = await groq_client.chat(
        messages=[...],
        json_mode=True,
        temperature=0.3,
        max_tokens=2048,
    )

# NEW:
async def parse_mod_request(description: str, mod_name: Optional[str] = None, model_preference: str = GROQ_MODEL) -> ModSpec:
    response = await model_router.chat(
        messages=[...],
        model_preference=model_preference,
        json_mode=True,
        temperature=0.3,
        max_tokens=2048,
    )
```

- [ ] **Step 2: Update code_generator.py**

Same pattern — replace import, add `model_preference` param to `generate_item_code()`, `generate_block_code()`, `generate_all_code()`, and change calls from `groq_client.chat()` to `model_router.chat()`.

- [ ] **Step 3: Update bedrock_generator.py**

Same pattern for `generate_bedrock_item()`, `generate_bedrock_entity()`, `generate_all_bedrock_code()`.

- [ ] **Step 4: Update ai_texture_generator.py**

Same pattern for `generate_texture()`, `generate_all_textures()`.

- [ ] **Step 5: Update error_fixer.py**

Same pattern for `fix_compilation_errors()`.

- [ ] **Step 6: Update edit_handler.py**

Same pattern for `apply_edits()`.

- [ ] **Step 7: Commit**

```bash
git add backend/services/mod_request_parser.py backend/services/code_generator.py backend/services/bedrock_generator.py backend/services/ai_texture_generator.py backend/services/error_fixer.py backend/services/edit_handler.py
git commit -m "refactor: replace groq_client with model_router in all services"
```

---

## Task 3: Thread model_preference through agent_loop and job_manager

**Files:**

- Modify: `backend/models.py`
- Modify: `backend/services/job_manager.py`
- Modify: `backend/services/agent_loop.py`
- Modify: `backend/routers/generate.py`
- Create: `supabase/migration-001-mvp.sql`

- [ ] **Step 1: Add model field to GenerateRequest in models.py**

Find the `GenerateRequest` model and add:

```python
class GenerateRequest(BaseModel):
    description: str
    mod_name: Optional[str] = None
    author_name: str = "ModCreator User"
    edition: str = "java"
    model: str = "gpt-oss-120b"  # NEW: "gpt-oss-120b" | "sonnet-4.6"
    custom_textures: Optional[List[dict]] = None
```

- [ ] **Step 2: Create database migration**

Create `supabase/migration-001-mvp.sql`:

```sql
-- Add model_used column to track which AI model generated the mod
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS model_used TEXT DEFAULT 'gpt-oss-120b';

-- Add user_id for auth (nullable for existing rows)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON jobs (user_id);

-- Update RLS policies for auth
DROP POLICY IF EXISTS "Allow public read" ON jobs;
DROP POLICY IF EXISTS "Allow public insert" ON jobs;
DROP POLICY IF EXISTS "Allow public update" ON jobs;

-- Anyone can browse gallery (public reads)
CREATE POLICY "Allow public read" ON jobs FOR SELECT USING (true);

-- Authenticated users can create jobs
CREATE POLICY "Allow authenticated insert" ON jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own jobs
CREATE POLICY "Allow owner update" ON jobs
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do anything (backend uses service key)
CREATE POLICY "Allow service role all" ON jobs
    FOR ALL USING (auth.role() = 'service_role');
```

- [ ] **Step 3: Update job_manager.py**

Add `model_used` and `user_id` parameters:

```python
async def create_job(
    description: str,
    mod_name: Optional[str],
    author_name: str,
    edition: str = "java",
    model_used: str = "gpt-oss-120b",  # NEW
    user_id: Optional[str] = None,  # NEW
) -> str:
    data = {
        "description": description,
        "mod_name": mod_name,
        "author_name": author_name,
        "status": "queued",
        "progress_message": "Queued...",
        "edition": edition,
        "generated_files": {},
        "model_used": model_used,  # NEW
    }
    if user_id:
        data["user_id"] = user_id
    result = supabase.table("jobs").insert(data).execute()
    return result.data[0]["id"]
```

- [ ] **Step 4: Update agent_loop.py to thread model_preference**

```python
async def run_agent_loop(job_id: str, request: GenerateRequest):
    model = request.model  # NEW: get model preference from request
    edition = request.edition
    try:
        await update_job(job_id, status="parsing", progress_message="Processing user prompt...")
        spec = await parse_mod_request(request.description, request.mod_name, model_preference=model)
        # ... (existing logic)

        if edition == "bedrock":
            await _run_bedrock_loop(job_id, spec, model_preference=model)
        else:
            await _run_java_loop(job_id, spec, model_preference=model)
    except Exception as e:
        # ... (existing error handling)


async def _run_java_loop(job_id: str, spec, model_preference: str = "gpt-oss-120b"):
    generated_files = await generate_all_code(spec, model_preference=model_preference)
    textures = await generate_all_textures(spec, model_preference=model_preference)
    # ... (existing compile logic)
    # Fix loop also gets model_preference:
    fixed = await fix_compilation_errors(files, errors, model_preference=model_preference)


async def _run_bedrock_loop(job_id: str, spec, model_preference: str = "gpt-oss-120b"):
    generated_files = await generate_all_bedrock_code(spec, model_preference=model_preference)
    textures = await generate_all_textures(spec, model_preference=model_preference)
    # ... (existing packaging logic)
```

- [ ] **Step 5: Update generate router to pass model**

In `backend/routers/generate.py`, update the generate endpoint:

```python
@router.post("/generate")
async def generate_mod(request: GenerateRequest, background_tasks: BackgroundTasks):
    job_id = await create_job(
        description=request.description,
        mod_name=request.mod_name,
        author_name=request.author_name,
        edition=request.edition,
        model_used=request.model,  # NEW
    )
    background_tasks.add_task(run_agent_loop, job_id, request)
    return {"job_id": job_id}
```

Also update status endpoint to include `model_used`:

```python
@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = await get_job(job_id)
    return JobStatus(
        # ... existing fields ...
        model_used=job.get("model_used", "gpt-oss-120b"),  # NEW
    )
```

Add `model_used` to the `JobStatus` model in `backend/models.py`:

```python
class JobStatus(BaseModel):
    # ... existing fields ...
    model_used: str = "gpt-oss-120b"  # NEW
```

- [ ] **Step 6: Update gallery router to include model_used**

In `backend/routers/gallery.py`, add `model_used` to the select query and transform:

```python
query = supabase.table("jobs").select(
    "id, mod_name, description, edition, created_at, jar_file_url, mod_spec, author_name, model_used"
)
```

And in the transform, add: `"model_used": mod.get("model_used", "gpt-oss-120b")`

- [ ] **Step 7: Commit**

```bash
git add backend/models.py backend/services/job_manager.py backend/services/agent_loop.py backend/routers/generate.py backend/routers/gallery.py supabase/migration-001-mvp.sql
git commit -m "feat: thread model preference through entire pipeline"
```

---

## Task 4: Supabase Auth — Backend

**Files:**

- Create: `backend/utils/auth.py`
- Modify: `backend/routers/generate.py`

- [ ] **Step 1: Create auth.py JWT validation dependency**

Create `backend/utils/auth.py`:

```python
"""FastAPI dependency for Supabase JWT validation."""
import jwt
from fastapi import Depends, HTTPException, Header
from typing import Optional
from config import settings


async def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[str]:
    """
    Extract and validate Supabase JWT from Authorization header.
    Returns user_id (UUID string) or None if no auth header.
    """
    if not authorization:
        return None

    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization[7:]  # Strip "Bearer "

    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
        return payload.get("sub")  # Supabase stores user ID in 'sub' claim
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_auth(user_id: Optional[str] = Depends(get_current_user)) -> str:
    """Dependency that requires authentication. Use on protected routes."""
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user_id
```

- [ ] **Step 2: Add auth to generate and edit routes**

Update `backend/routers/generate.py`:

```python
from utils.auth import require_auth
from fastapi import Depends

@router.post("/generate")
async def generate_mod(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(require_auth),  # NEW: require auth
):
    job_id = await create_job(
        description=request.description,
        mod_name=request.mod_name,
        author_name=request.author_name,
        edition=request.edition,
        model_used=request.model,
        user_id=user_id,  # NEW: link job to user
    )
    background_tasks.add_task(run_agent_loop, job_id, request)
    return {"job_id": job_id}

@router.post("/edit/{job_id}")
async def edit_mod(
    job_id: str,
    request: EditRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(require_auth),  # NEW
):
    # ... existing logic
```

Status and download endpoints remain public (no auth dependency).

- [ ] **Step 3: Commit**

```bash
git add backend/utils/auth.py backend/routers/generate.py
git commit -m "feat: add Supabase JWT auth to generate/edit endpoints"
```

---

## Task 5: Supabase Auth — Frontend

**Files:**

- Create: `frontend/src/lib/supabase.ts`
- Modify: `frontend/package.json`
- Modify: `frontend/src/components/SignupModal.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Install Supabase JS client**

```bash
cd frontend && npm install @supabase/supabase-js
```

- [ ] **Step 2: Create Supabase client**

Create `frontend/src/lib/supabase.ts`:

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Get current session token for API calls.
 * Returns null if not authenticated.
 */
export async function getAuthToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Check if user is currently authenticated.
 */
export async function isAuthenticated(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session;
}
```

- [ ] **Step 3: Update api.ts to attach auth tokens**

Add to `frontend/src/lib/api.ts`:

```typescript
import { getAuthToken } from "./supabase";

async function authHeaders(): Promise<HeadersInit> {
  const token = await getAuthToken();
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}
```

Update `generateMod()` to use auth headers and accept model:

```typescript
export async function generateMod(
  description: string,
  modName?: string,
  authorName?: string,
  edition: string = "java",
  model: string = "gpt-oss-120b",  // NEW
  customTextures?: CustomTexture[],
): Promise<{ job_id: string }> {
  const res = await fetch(`${API_BASE}/api/generate`, {
    method: "POST",
    headers: await authHeaders(),  // NEW: auth token
    body: JSON.stringify({
      description,
      mod_name: modName || null,
      author_name: authorName || "ModCreator User",
      edition,
      model,  // NEW
      custom_textures: customTextures?.length ? customTextures : null,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Failed to generate mod");
  }
  return res.json();
}
```

Add `model_used` to `JobStatus` interface:

```typescript
export interface JobStatus {
  // ... existing fields ...
  model_used: string;  // NEW
}
```

- [ ] **Step 4: Rewrite SignupModal with real Supabase auth**

Replace the entire `frontend/src/components/SignupModal.tsx` with real auth using `supabase.auth.signUp()`, `supabase.auth.signInWithPassword()`, and `supabase.auth.signInWithOAuth({ provider: "google" })`.

Key changes:
- Replace `isSignedUp()` sync function with async version using `supabase.auth.getSession()`
- Replace `markSignedUp()` localStorage calls with real Supabase auth calls
- Add password field to the form
- Add Google OAuth button
- Add login/signup toggle

**Important**: `isSignedUp()` changes from sync to async. All callers need updating. Replace synchronous checks with `useEffect` + state pattern:

```typescript
const [authed, setAuthed] = useState(false);
useEffect(() => {
  supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    setAuthed(!!session);
  });
  return () => listener.subscription.unsubscribe();
}, []);
```

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/supabase.ts frontend/src/lib/api.ts frontend/src/components/SignupModal.tsx frontend/package.json frontend/package-lock.json
git commit -m "feat: add real Supabase auth (email/password + Google OAuth)"
```

---

## Task 6: Model Toggle UI

**Files:**

- Modify: `frontend/src/app/page.tsx` (Home page)
- Modify: `frontend/src/app/status/[jobId]/page.tsx`

- [ ] **Step 1: Create model toggle on Home page**

Add a model selector component near the prompt input in `frontend/src/app/page.tsx`:

```typescript
const [selectedModel, setSelectedModel] = useState<string>(() => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("mc_model_preference") || "gpt-oss-120b";
  }
  return "gpt-oss-120b";
});

function handleModelChange(model: string) {
  setSelectedModel(model);
  localStorage.setItem("mc_model_preference", model);
}
```

Toggle JSX (place above or next to the prompt input):

```tsx
<div className="flex gap-2 mb-4">
  <button
    onClick={() => handleModelChange("gpt-oss-120b")}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
      selectedModel === "gpt-oss-120b"
        ? "bg-[#00ff88] text-black"
        : "bg-[#1a1a2e] text-gray-400 border border-gray-700 hover:border-[#00ff88]/50"
    }`}
  >
    GPT-OSS 120B (Fast)
  </button>
  <button
    onClick={() => handleModelChange("sonnet-4.6")}
    className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
      selectedModel === "sonnet-4.6"
        ? "bg-[#8b5cf6] text-white"
        : "bg-[#1a1a2e] text-gray-400 border border-gray-700 hover:border-[#8b5cf6]/50"
    }`}
  >
    Sonnet 4.6 (Quality)
  </button>
</div>
```

Pass `selectedModel` to the `generateMod()` call in the form submit handler.

- [ ] **Step 2: Show model badge on status page**

In `frontend/src/app/status/[jobId]/page.tsx`, display `model_used` from the status response:

```tsx
{status?.model_used && (
  <span className={`px-2 py-1 rounded text-xs font-semibold ${
    status.model_used === "sonnet-4.6"
      ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
      : "bg-[#00ff88]/20 text-[#00ff88]"
  }`}>
    {status.model_used === "sonnet-4.6" ? "Sonnet 4.6" : "GPT-OSS 120B"}
  </span>
)}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/page.tsx frontend/src/app/status/\\[jobId\\]/page.tsx
git commit -m "feat: add model toggle UI on home page + model badge on status"
```

---

## Task 7: Wire /create chat to real backend

**Files:**

- Modify: `frontend/src/components/ChatInterface.tsx`

- [ ] **Step 1: Replace dummy response flow with real API**

This is the biggest UI change. The current `submitPrompt()` calls `findResponse()` synchronously and returns mock `ItemData[]`. Replace with async job submission + polling.

Update the `Message` type:

```typescript
type MessageType = "user" | "ai" | "generation-started" | "generation-complete" | "generation-failed";

interface Message {
  role: MessageType;
  text: string;
  items?: ItemData[];
  jobId?: string;
  downloadUrl?: string;
  modelUsed?: string;
}
```

Replace `submitPrompt()` to:
1. Call `generateMod()` from `@/lib/api`
2. Add a `generation-started` message with spinner
3. Poll `getStatus()` every 2.5s, updating progress text
4. On completion: replace with `generation-complete` message + download button
5. On failure: show `generation-failed` message

Add `pollJobStatus()` helper that polls and updates message text via `setMessages`.

- [ ] **Step 2: Add render logic for new message types**

Add JSX cases for:
- `generation-started`: animated spinner + progress text
- `generation-complete`: success message + model badge + download button
- `generation-failed`: error message in red with retry option

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ChatInterface.tsx
git commit -m "feat: wire /create chat to real backend with async job flow"
```

---

## Task 8: Wire /gallery to real API

**Files:**

- Modify: `frontend/src/app/gallery/page.tsx`
- Modify: `frontend/src/lib/api.ts`

- [ ] **Step 1: Add proper gallery types to api.ts**

Add `GalleryMod` interface and `GalleryResponse` type matching the actual API response format:
- Fields: `id`, `name`, `description`, `author`, `edition`, `created_at`, `download_url`, `model_used`, `item_count`, `block_count`
- Response wrapper: `{ mods: GalleryMod[], total: number }`
- Add `getGallery()` function with `sort`, `edition`, `limit`, `offset` params

- [ ] **Step 2: Replace mock data in gallery page**

In `frontend/src/app/gallery/page.tsx`:

1. Remove import of `MOCK_EXPLORE_MODS` from `@/lib/exploreData`
2. Add import of `getGallery, GalleryMod` from `@/lib/api`
3. Replace static `MOCK_EXPLORE_MODS` with `useEffect` + `useState` fetching from real API
4. Update rendering to use `GalleryMod` field names (`name`, `download_url`, `model_used`)
5. Add loading state while fetching

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/gallery/page.tsx frontend/src/lib/api.ts
git commit -m "feat: wire gallery to real API, remove mock data usage"
```

---

## Task 9: Ad Placements

**Files:**

- Create: `frontend/src/components/AdBanner.tsx`
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/app/page.tsx`
- Modify: `frontend/src/app/gallery/page.tsx`
- Modify: `frontend/src/app/status/[jobId]/page.tsx`

- [ ] **Step 1: Create AdBanner component**

Create `frontend/src/components/AdBanner.tsx` with:
- Props: `slot` (AdSense slot ID), `format` (auto/horizontal/vertical/rectangle), `className`
- If `NEXT_PUBLIC_ADSENSE_CLIENT_ID` env var is missing, render a dev placeholder div
- Otherwise render an AdSense `<ins>` tag and push to `adsbygoogle` array on mount

- [ ] **Step 2: Add AdSense script to layout.tsx**

In `frontend/src/app/layout.tsx`, add AdSense script tag using Next.js `Script` component with `strategy="afterInteractive"`. Only render if `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set.

- [ ] **Step 3: Insert AdBanner into pages**

- Home page (`page.tsx`): Add `<AdBanner slot="home-hero" />` below the hero section
- Gallery page: Add `<AdBanner slot="gallery-feed" />` between every 4th mod card
- Status page: Add `<AdBanner slot="status-wait" />` below progress section

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/AdBanner.tsx frontend/src/app/layout.tsx frontend/src/app/page.tsx frontend/src/app/gallery/page.tsx frontend/src/app/status/\\[jobId\\]/page.tsx
git commit -m "feat: add Google AdSense ad placements on key pages"
```

---

## Task 10: PWA Support

**Files:**

- Create: `frontend/public/manifest.json`
- Create: `frontend/public/sw.js`
- Modify: `frontend/src/app/layout.tsx`

- [ ] **Step 1: Create manifest.json**

Create `frontend/public/manifest.json` with app name "ModCrafter", theme color `#00ff88`, background `#0a0a0a`, `display: "standalone"`, and icon references (192px and 512px).

Note: Icon PNGs (`icon-192.png`, `icon-512.png`) need to be created separately — Minecraft-themed pixel art.

- [ ] **Step 2: Create service worker**

Create `frontend/public/sw.js` with:
- `install`: cache static routes (`/`, `/create`, `/gallery`)
- `activate`: clean old caches
- `fetch`: network-first for `/api/` calls, cache-first for static assets

- [ ] **Step 3: Register service worker and link manifest in layout.tsx**

In `frontend/src/app/layout.tsx`:
- Add `manifest: "/manifest.json"` to the `metadata` export
- Add a `<Script>` tag at the end of body that registers the service worker using `navigator.serviceWorker.register('/sw.js')`. Use Next.js Script component with `strategy="afterInteractive"` and inline script content.

- [ ] **Step 4: Commit**

```bash
git add frontend/public/manifest.json frontend/public/sw.js frontend/src/app/layout.tsx
git commit -m "feat: add PWA support with manifest and service worker"
```

---

## Task 11: Integration Testing and Final Verification

- [ ] **Step 1: Run the Supabase migration**

Apply `supabase/migration-001-mvp.sql` via Supabase dashboard SQL editor or CLI.

- [ ] **Step 2: Set environment variables**

Backend `.env`: `GROQ_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET`

Frontend `.env.local`: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`

- [ ] **Step 3: Install dependencies**

```bash
cd backend && pip install -r requirements.txt
cd ../frontend && npm install
```

- [ ] **Step 4: Start backend and verify health endpoint**

```bash
cd backend && uvicorn main:app --reload --port 8000
# curl http://localhost:8000/health -> {"status": "ok"}
```

- [ ] **Step 5: Test model toggle with GPT-OSS 120B**

POST to `/api/generate` with `"model": "gpt-oss-120b"`, poll status until complete, verify download works.

- [ ] **Step 6: Test model toggle with Sonnet 4.6**

Same request with `"model": "sonnet-4.6"`. Verify both models produce working output.

- [ ] **Step 7: Full E2E browser test**

Start frontend (`npm run dev`), test:
1. Sign up via modal (email/password)
2. Select model, type prompt, submit -> redirects to status page
3. Status page shows progress + model badge
4. Download works when complete
5. `/create` chat sends real generation request
6. `/gallery` shows real mods from database
7. Ad placeholders visible
8. PWA manifest visible in DevTools > Application

- [ ] **Step 8: Final commit**

```bash
git add -A
git commit -m "chore: integration test fixes and final cleanup"
```

---

## Execution Order Summary

| Task | Est. Time | Dependencies |
| --- | --- | --- |
| 1. Backend Model Router | 30 min | None |
| 2. Replace groq_client in services | 30 min | Task 1 |
| 3. Thread model through pipeline | 30 min | Task 2 |
| 4. Supabase Auth — Backend | 20 min | None (parallel with 1-3) |
| 5. Supabase Auth — Frontend | 40 min | Task 4 |
| 6. Model Toggle UI | 20 min | Task 3 |
| 7. Wire /create chat | 45 min | Tasks 3, 5 |
| 8. Wire /gallery to API | 20 min | None |
| 9. Ad Placements | 15 min | None |
| 10. PWA Support | 15 min | None |
| 11. Integration Testing | 30 min | All above |
| **Total** | **~5 hours** | |

**Parallelization**: Tasks 1-3 (model router) can run parallel with Task 4 (backend auth). Tasks 8, 9, 10 are fully independent.
