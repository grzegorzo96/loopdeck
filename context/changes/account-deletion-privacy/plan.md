# Account deletion and privacy policy — Implementation Plan

## Overview

Privacy policy before sign-up (NFR) and account deletion with all tasks removed (FR-001b). Runs parallel to F-01/S-01.

## Current State Analysis

- Auth: sign-up/sign-in/sign-out working
- No `/privacy` page; SignUpForm has no policy link
- No service role client; no delete-account flow
- F-01: `tasks.user_id` ON DELETE CASCADE → tasks removed when auth user deleted

## Desired End State

- `/privacy` — public static page describing email collection and data use
- SignUpForm links to privacy policy before submit
- `POST /api/auth/delete-account` — deletes auth user via admin API
- Dashboard/settings: "Delete account" with confirmation
- `SUPABASE_SERVICE_ROLE_KEY` in astro env schema + `.env.example`

## What We're NOT Doing

- GDPR data export
- Email notification on deletion
- Admin panel

## Critical Implementation Details

**Service role:** Create `src/lib/supabase-admin.ts` using service role key — server-only, never imported by client components. Used only in delete-account route.

**Delete order:** `auth.admin.deleteUser(userId)` — CASCADE removes tasks via FK.

## Phase 1: Privacy policy

### Changes Required

#### 1. Privacy page

**File:** `src/pages/privacy.astro` (new)

**Intent:** NFR — readable before sign-up.

**Contract:** Public route (not in PROTECTED_ROUTES). Plain language: what data collected (email), purpose, retention, contact, deletion rights. Link from index/signup.

#### 2. SignUpForm link

**Files:** `src/components/auth/SignUpForm.tsx`, optionally `src/pages/auth/signup.astro`

**Intent:** User sees policy before creating account.

**Contract:** Link text e.g. "Privacy policy" opening `/privacy` near submit button.

### Success Criteria

#### Manual

- `/privacy` loads without auth
- Sign-up page shows link

---

## Phase 2: Account deletion

### Changes Required

#### 1. Admin client + env

**Files:** `src/lib/supabase-admin.ts`, `astro.config.mjs`, `.env.example`

**Intent:** Server-side user deletion capability.

**Contract:** `SUPABASE_SERVICE_ROLE_KEY` — server secret, optional (route returns 503 if missing). Admin client with `createClient(url, serviceRoleKey, { auth: { persistSession: false } })`.

#### 2. Delete account API

**File:** `src/pages/api/auth/delete-account.ts` (new)

**Intent:** FR-001b self-service deletion.

**Contract:** `prerender = false`, POST, require session user. Call `admin.auth.admin.deleteUser(user.id)`. Sign out cookies. Return redirect to `/` or JSON 200.

#### 3. Delete account UI

**File:** `src/pages/dashboard.astro` or `DeleteAccountSection.tsx`

**Intent:** User-initiated deletion with guard.

**Contract:** Confirm dialog or type "DELETE". Form POST to delete-account API.

### Success Criteria

#### Automated

- lint, check, build pass (with optional service role in CI or skipped delete test)

#### Manual

- Delete account removes user; tasks gone in Studio
- Sign-out after delete; cannot sign in with old credentials

---

## Phase 3: Verification

#### Manual

- Privacy linked on signup
- Full delete flow on local Supabase

## References

- PRD FR-001b, NFR privacy policy

## Progress

### Phase 1: Privacy policy

#### Automated

- [x] 1.1 Lint, check, build pass

#### Manual

- [x] 1.2 Privacy page public; signup link present

### Phase 2: Account deletion

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 Account + tasks deleted via UI

### Phase 3: Verification

#### Manual

- [x] 3.1 Service role not exposed to client bundle
