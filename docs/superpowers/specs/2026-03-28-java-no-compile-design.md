# Java Edition: No-Compile ZIP Output

**Date:** 2026-03-28
**Status:** Approved
**Summary:** Remove server-side Gradle compilation from the Java Edition pipeline. Instead of producing a compiled `.jar`, output a ready-to-build Forge project as a `.zip` file. Add a smart, OS-aware build guide on the status page and guide page.

---

## Motivation

Server-side Gradle compilation requires 3GB RAM, JDK 17, and 60-180s per build. This makes deployment on affordable platforms (Render Standard, Railway Hobby) impractical. By removing compilation, the Java pipeline becomes identical in cost to Bedrock — just API calls + file I/O + ZIP.

## Design Decisions

### 1. Output Format
- Java mods output a `.zip` file containing a complete Forge 1.20.1 project
- The ZIP includes gradlew, source code, textures, recipes — everything needed to build
- User runs `./gradlew build` locally to produce the `.jar`

### 2. Token Cost
- Java reduced from 2 tokens to 1 token (same as Bedrock — no server compute cost)

### 3. Status Flow (Simplified)
```
Old: queued → parsing → generating → compiling → fixing → complete/failed
New: queued → parsing → generating → packaging → complete/failed
```
- "compiling" and "fixing" states removed
- "packaging" state added (ZIP creation, ~1-2 seconds)

### 4. Build Guide (Approach C: Both Inline + Page)
- **Inline on status page:** After Java mod completes, show OS-detected quick-start instructions below the download button
- **Guide page:** Update the "Java (Forge)" tab to explain building from source instead of just dropping a .jar

### 5. OS Detection
- Use `navigator.userAgent` / `navigator.platform` to detect Windows/macOS/Linux
- Show appropriate commands (gradlew.bat vs ./gradlew, JDK install links per OS)

---

## Backend Changes

### agent_loop.py — `_run_java_loop()`
- Remove: `compile_mod()` call, fix loop, `error_fixer` import
- Add: ZIP the assembled project directory using `shutil.make_archive()`
- Upload `.zip` instead of `.jar`
- Status flow: generating → packaging → complete

### agent_loop.py — `run_edit_loop()` (Java branch)
- Same change: remove compile+fix, add ZIP packaging

### generate.py — Download endpoint
- Change Java file extension from `-1.0.0.jar` to `.zip`

### config.py
- Remove `max_fix_iterations` and `build_timeout_seconds` (no longer used)

### models.py — JobStatus
- Remove `iteration` and `max_iterations` fields (no compile loop)
- Update status type to remove "compiling" and "fixing"

### Files no longer imported (keep for potential future cloud compile feature):
- `services/mod_compiler.py`
- `services/error_fixer.py`
- `prompts/fix_prompt.py`

---

## Frontend Changes

### api.ts
- Remove "compiling" | "fixing" from JobStatus.status type
- Add "packaging" to status type
- Remove `iteration` and `max_iterations` from JobStatus

### DownloadButton.tsx
- Java: Show "Download Project (.zip)" instead of "Download .jar"
- Java: Change install hint to "Extract and run ./gradlew build to compile"
- Bedrock: No changes

### Status page ([jobId]/page.tsx)
- Remove iteration display (no compile loop)
- After Java mod completes, show inline build guide section with:
  - OS auto-detection
  - Step-by-step: Extract → Install JDK 17 → Run gradlew → Find JAR → Install
  - Copy-paste terminal commands
  - Links to JDK download

### Guide page (guide/page.tsx)
- Rename "Java (Forge)" tab to "Java (Forge) — Build from Source"
- Replace steps: old flow was "drop .jar in mods folder", new flow is:
  1. Install JDK 17
  2. Extract the ZIP
  3. Open terminal in extracted folder
  4. Run `./gradlew build` (or `gradlew.bat build` on Windows)
  5. Find JAR in `build/libs/`
  6. Drop JAR in mods folder + launch with Forge

---

## Infrastructure Changes

### Dockerfile
- Remove: `apt-get install openjdk-17-jdk-headless`
- Remove: `JAVA_HOME` env var
- Remove: Gradle cache warmup step
- Result: Image shrinks from ~2GB+ to ~200MB

### render.yaml
- Remove: `MAX_FIX_ITERATIONS` and `BUILD_TIMEOUT_SECONDS` env vars
- Can downgrade to smaller plan since no 3GB RAM needed

---

## What's NOT Changing

- AI parsing pipeline (unchanged)
- AI code generation (unchanged)
- Project assembly / mod_assembler.py (unchanged — still creates the full Forge project)
- Texture generation (unchanged)
- Bedrock pipeline (unchanged)
- Edit flow logic (still regenerates code, just packages differently)
- Gallery, user system, token system (unchanged except cost)
