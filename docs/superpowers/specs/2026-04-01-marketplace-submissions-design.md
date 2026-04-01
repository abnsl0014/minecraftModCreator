# Marketplace & Mod Submissions Design

**Date:** 2026-04-01
**Status:** Approved
**Version:** 1.0

## Overview

Add a community mod marketplace where users can submit mod showcases (both AI-generated and external uploads), admins approve/reject them, and creators earn revenue tracked per download. Inspired by [creativemode.net](https://creativemode.net/mod/quest-board-d5gok4r7).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin auth | `is_admin` column on `user_profiles` | Flexible, scales to multiple admins, single migration |
| Payout model | Revenue tracking + manual payouts | Track downloads + show ₹ earned dashboard; actual payouts via UPI/bank offline. Avoids KYC/payout gateway complexity at this stage |
| Media support | Screenshots (upload) + video URL (embed) | Matches existing submit modal. No video hosting costs |
| Architecture | Separate `mod_submissions` table | Clean separation from `jobs`. Submissions have their own lifecycle. Optional `job_id` links AI-generated mods |

## Database Schema

### New table: `mod_submissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `user_id` | UUID FK → auth.users | Submitter |
| `job_id` | UUID FK → jobs, nullable | Links AI-generated mod (null for external uploads) |
| `title` | TEXT NOT NULL | Display name |
| `description` | TEXT NOT NULL | Full description with install instructions |
| `edition` | TEXT NOT NULL | `java` or `bedrock` |
| `category` | TEXT NOT NULL | `weapon`, `tool`, `armor`, `food`, `block`, `ability` |
| `tags` | TEXT[] | Searchable tags array |
| `screenshots` | TEXT[] | Supabase Storage URLs (up to 5) |
| `video_url` | TEXT, nullable | YouTube/external embed link |
| `download_url` | TEXT NOT NULL | Supabase Storage URL for mod file |
| `crafting_recipe` | JSONB, nullable | 3x3 grid recipe data |
| `survival_guide` | TEXT, nullable | In-game usage instructions |
| `status` | TEXT NOT NULL DEFAULT 'pending' | `pending`, `approved`, `rejected` |
| `rejection_reason` | TEXT, nullable | Admin feedback on rejection |
| `download_count` | INT NOT NULL DEFAULT 0 | Incremented per unique download |
| `featured` | BOOLEAN NOT NULL DEFAULT false | Admin-toggled |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |
| `updated_at` | TIMESTAMPTZ DEFAULT now() | |

### New table: `download_events`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | `gen_random_uuid()` |
| `submission_id` | UUID FK → mod_submissions | Which mod |
| `downloader_ip` | TEXT NOT NULL | For dedup (prevent spam) |
| `created_at` | TIMESTAMPTZ DEFAULT now() | |

### Altered table: `user_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `is_admin` | BOOLEAN NOT NULL DEFAULT false | Admin access flag |
| `display_name` | TEXT, nullable | Public profile name |
| `earnings_balance` | INT NOT NULL DEFAULT 0 | Accumulated earnings in paise (₹) |

### Indexes

- `idx_submissions_user_id` on `mod_submissions(user_id)`
- `idx_submissions_status` on `mod_submissions(status)`
- `idx_submissions_featured` on `mod_submissions(featured)` WHERE `featured = true`
- `idx_download_events_submission` on `download_events(submission_id)`
- `idx_download_events_dedup` on `download_events(submission_id, downloader_ip)` — for unique check

### Storage

- New bucket: `mod-screenshots` (public, 10MB max per file, images only)
- Existing `mod-jars` bucket reused for external mod file uploads

## API Design

### Submission endpoints (`/api/submissions`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/submissions` | Required | Create submission with file + screenshot uploads |
| `GET` | `/api/submissions/my` | Required | List user's own submissions |
| `GET` | `/api/submissions/{id}` | Public | View submission (approved = public, pending/rejected = owner or admin only) |
| `PUT` | `/api/submissions/{id}` | Owner | Edit pending submission |
| `DELETE` | `/api/submissions/{id}` | Owner | Delete own submission |

### Download endpoint

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/submissions/{id}/download` | Public | Increment counter (IP-deduped), return download URL |

### Admin endpoints (`/api/admin`)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/admin/submissions` | Admin | List with status filter |
| `POST` | `/api/admin/submissions/{id}/approve` | Admin | Approve, optionally feature |
| `POST` | `/api/admin/submissions/{id}/reject` | Admin | Reject with reason |
| `POST` | `/api/admin/submissions/{id}/feature` | Admin | Toggle featured |

### Updated existing endpoints

| Method | Endpoint | Change |
|--------|----------|--------|
| `GET` | `/api/gallery` | Merge approved submissions + completed AI jobs |
| `GET` | `/api/user/profile` | Return `earnings_balance`, `display_name`, `is_admin` |
| `GET` | `/api/user/{id}/public` | New — public profile with approved mods + stats |

## Backend File Structure

```
backend/
  routers/
    submissions.py          # Submission CRUD + download
    admin.py                # Admin approval endpoints
  services/
    submission_manager.py   # DB operations for submissions
    download_tracker.py     # Download counting, IP dedup, earnings calc
  utils/
    admin_auth.py           # require_admin FastAPI dependency
```

Follows existing pattern: routers → services → utils.

## Frontend Changes

### New Pages

| Page | Path | Description |
|------|------|-------------|
| Mod detail | `/gallery/[id]` | Full showcase: screenshots, video embed, recipe, download button, author |
| Submit form | `/gallery/submit` | Multi-step form (basics → media → file → review). Replaces modal |
| My submissions | `/gallery/my-submissions` | User's submissions with status, stats, edit/delete |
| Public profile | `/profile/[id]` | Display name, approved mods grid, total downloads |

### Updated Pages

| Page | Path | Change |
|------|------|--------|
| Gallery | `/gallery` | Merge approved submissions into feed. Sort by recent/downloads/featured |
| Admin | `/gallery/admin` | Rewire from localStorage to real API |

### New Components

```
frontend/src/
  components/
    submissions/
      SubmitForm.tsx          # Multi-step submission form
      ScreenshotUploader.tsx  # Drag-and-drop image upload (up to 5)
      ModFileUploader.tsx     # Mod file upload or AI job picker
    gallery/
      ModCard.tsx             # Updated — unified card for both sources
      DownloadButton.tsx      # Updated — POST to increment counter
```

### Deprecated Components

- `SubmitModModal.tsx` → replaced by `/gallery/submit` page
- `ModDetailModal.tsx` → replaced by `/gallery/[id]` page

## Download Tracking & Earnings

- Each download hits `POST /api/submissions/{id}/download`
- Backend checks `download_events` for existing `(submission_id, downloader_ip)` within last 24 hours
- If no recent event: insert event, increment `mod_submissions.download_count`, add earnings to author's `user_profiles.earnings_balance`
- If duplicate IP within 24 hours: return download URL but don't increment counter or earnings
- Per-download rate: configurable in `config.py` (default: 100 paise = ₹1 per download)
- Earnings dashboard visible on `/gallery/my-submissions`

## Earnings Rate Config

```python
# config.py
earnings_per_download: int = 100  # paise (₹1 per download)
```

This rate can be adjusted without code changes via environment variable.

## Auth Dependencies

```python
# utils/admin_auth.py
async def require_admin(user = Depends(require_auth)):
    """FastAPI dependency — raises 403 if user is not admin."""
    # Query user_profiles.is_admin
    # Raise HTTPException(403) if not admin
    return user
```

Reuses the existing `require_auth` pattern from `utils/auth.py`.

## Migration

Single migration file: `supabase/migration-004-marketplace.sql`

1. Create `mod_submissions` table with all columns and indexes
2. Create `download_events` table with indexes
3. Alter `user_profiles`: add `is_admin`, `display_name`, `earnings_balance`
4. Create `mod-screenshots` storage bucket
5. Set Divyansh's user ID as initial admin

## Out of Scope

- Automated payouts (manual for now)
- Video file uploads (YouTube links only)
- Comments/reviews on submissions
- Like/rating system (can add later)
- Search within submissions (basic filter by category/edition/tags for now)
