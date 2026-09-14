# Task schema with RLS and focus-count contract — Implementation Plan

## Overview

Land the database and TypeScript foundation for Loopdeck tasks: a `tasks` table with `focus_date` and `completed_at`, per-user RLS, a Postgres trigger that rejects a fourth focus assignment, and a reusable focus-count service module. This unblocks S-01 (first focus capture) without shipping API routes or UI.

## Current State Analysis

The app is an Astro 7 SSR scaffold with Supabase auth only:

- `src/lib/supabase.ts` — cookie-based SSR client; returns `null` when env vars missing
- `src/middleware.ts` — attaches `User` to `Astro.locals`; protects page routes, not `/api/*`
- `src/pages/api/auth/*` — form POST + redirect pattern; no `prerender = false`, no zod yet
- **No** `supabase/migrations/`, **no** `src/types.ts`, **no** task tables or services

Schema intent is documented in `context/foundation/shape-notes.md` and enforced by PRD NFRs (per-user isolation, server-side limit of 3).

### Key Discoveries

- Roadmap F-01 change ID is `task-schema-rls`; status was `ready`, now entering planning
- Focus count = `COUNT(*) WHERE user_id = ? AND focus_date = ?` — **completed rows count** (FR-004a)
- Client supplies local date on read/write; server rejects dates outside UTC today ± 1 day (shape-notes)
- CI smoke job runs `supabase start`, which will apply new migrations automatically

## Desired End State

1. `supabase/migrations/<timestamp>_create_tasks.sql` creates the `tasks` table with RLS and a focus-limit trigger.
2. `src/types.ts` exports a `Task` entity matching table columns.
3. `src/lib/services/tasks.ts` exports:
   - `FOCUS_LIMIT` constant (`3`)
   - `validateFocusDate(localDate: string)` — parse + ±1 UTC day window
   - `countFocusSlots(supabase, focusDate)` — count for authenticated user
   - `checkFocusLimit(supabase, focusDate)` — typed `{ allowed, currentCount, limit }` result
   - Error code mapping for trigger `focus_limit_exceeded` (for S-02 refusal UX)
4. README no longer claims auth-only DB usage.
5. Local verification: migration applies, lint/check/build pass, manual RLS + limit checks documented.

## What We're NOT Doing

- Task CRUD API routes (`/api/tasks/*`) — deferred to S-01
- Dashboard or task UI components — S-01
- Swap/refusal interaction — S-02
- Zod schemas for HTTP input — no routes in F-01
- Supabase `gen types` codegen pipeline
- Automated SQL test script in `scripts/`
- Metrics/event recording — S-07
- `title` editing, delete-task behavior — S-05
- Day-reset logic — S-04 (lazy reset on read uses `focus_date` comparison)

## Implementation Approach

Three incremental phases: schema first (source of truth), then TypeScript contract mirroring DB rules, then verification. The Postgres trigger and TypeScript service share identical count semantics — all rows with a non-null `focus_date` for the target day, regardless of `completed_at`.

RLS uses the authenticated user's session (`auth.uid() = user_id`) on four separate policies. The trigger fires `BEFORE INSERT OR UPDATE OF focus_date` when `NEW.focus_date IS NOT NULL`, counting sibling rows for the same `(user_id, focus_date)` and raising an exception when count ≥ 3.

## Critical Implementation Details

**Trigger row exclusion on UPDATE:** When updating an existing row's `focus_date`, the count query must exclude `NEW.id` so a row already in focus does not count against itself. Inserts count all rows for the `(user_id, focus_date)` pair.

**Swap sequencing (S-02 downstream):** A focus swap is two writes (unset A, set B). S-01/S-02 must perform swap in a single transaction or as unset-then-set where the unset completes before the set — otherwise the trigger may block the set while 3 slots remain occupied. F-01 does not implement swap; note this for the S-02 implementer.

## Phase 1: Database migration

### Overview

Create the first Supabase migration: `tasks` table, supporting indexes, granular RLS policies, and a focus-limit trigger function.

### Changes Required

#### 1. Tasks table migration

**File:** `supabase/migrations/<YYYYMMDDHHmmss>_create_tasks.sql`

**Intent:** Define the persistent task model with per-user isolation and focus-day semantics. This is the single source of truth for column names and types used in `src/types.ts`.

**Contract:**

- Table `public.tasks`:
  - `id` — `uuid` PK, default `gen_random_uuid()`
  - `user_id` — `uuid` NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE
  - `title` — `text` NOT NULL
  - `created_at` — `timestamptz` NOT NULL, default `now()`
  - `focus_date` — `date` NULL (NULL = backlog)
  - `completed_at` — `timestamptz` NULL (NULL = open)
- Indexes:
  - `(user_id)` — general user scoping
  - `(user_id, focus_date)` WHERE `focus_date IS NOT NULL` — focus count queries
  - `(user_id, created_at DESC)` — backlog newest-first (FR-003a)
- Enable RLS on `tasks`
- Four policies for role `authenticated`, each `USING (auth.uid() = user_id)` and `WITH CHECK (auth.uid() = user_id)`:
  - `tasks_select_own`
  - `tasks_insert_own`
  - `tasks_update_own`
  - `tasks_delete_own`

#### 2. Focus-limit trigger

**File:** same migration file

**Intent:** Enforce the hard limit of 3 focus slots per user per day at the data layer, closing race windows that a TypeScript-only check cannot.

**Contract:**

- Function `public.enforce_focus_limit()` — `RETURNS trigger`, `SECURITY DEFINER` or `INVOKER` with RLS respected (prefer `SECURITY INVOKER` so RLS applies; trigger runs in inserting user's context)
- Fire `BEFORE INSERT OR UPDATE OF focus_date` on `tasks`
- Skip when `NEW.focus_date IS NULL` (backlog / unset)
- Count: `SELECT COUNT(*) FROM tasks WHERE user_id = NEW.user_id AND focus_date = NEW.focus_date AND (TG_OP = 'INSERT' OR id IS DISTINCT FROM NEW.id)`
- When count ≥ 3: `RAISE EXCEPTION` with SQLSTATE `P0001` and message containing `focus_limit_exceeded` (stable string for app mapping in S-02)
- Allow UPDATE that keeps the same `focus_date` without re-counting as a new slot (changing title/completed_at on an already-focused row must not trigger limit failure)

Snippet for non-obvious UPDATE guard (same focus_date, no new slot):

```sql
-- On UPDATE: if focus_date unchanged and row was already focused, skip limit check
IF TG_OP = 'UPDATE' AND OLD.focus_date IS NOT DISTINCT FROM NEW.focus_date THEN
  RETURN NEW;
END IF;
```

### Success Criteria

#### Automated Verification

- Migration applies cleanly: `npx supabase db reset` (requires local Docker)
- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Production build passes: `npm run build`

#### Manual Verification

- In Supabase Studio or `psql`: insert 3 focused tasks for one user/day succeeds; 4th insert with same `focus_date` fails with `focus_limit_exceeded`
- Cross-user isolation: user B cannot SELECT user A's tasks (returns empty under RLS)
- UPDATE focused row's `title` or `completed_at` without changing `focus_date` succeeds
- Unset focus (`focus_date = NULL`) always succeeds regardless of count

**Implementation Note:** Pause after this phase for manual confirmation before Phase 2.

---

## Phase 2: Application contract

### Overview

Add shared TypeScript types and a focus-count service module that S-01+ will import. Mirror DB count semantics exactly.

### Changes Required

#### 1. Task entity types

**File:** `src/types.ts` (new)

**Intent:** Provide a single shared Task type aligned to the migration so API routes and UI islands share one shape.

**Contract:**

- Export `Task` interface with fields: `id`, `user_id`, `title`, `created_at`, `focus_date`, `completed_at` — types matching Postgres (`string` for uuid/dates in ISO form, `string | null` for nullable fields)
- Export `FOCUS_LIMIT = 3` constant
- Export `FocusLimitResult` discriminated union: `{ allowed: true; currentCount: number; limit: number } | { allowed: false; currentCount: number; limit: number; reason: 'focus_limit_exceeded' | 'invalid_focus_date' }`

#### 2. Focus-count service

**File:** `src/lib/services/tasks.ts` (new)

**Intent:** Centralize focus-date validation and slot counting so S-01 API routes call one module instead of duplicating PRD rules.

**Contract:**

- `validateFocusDate(localDate: string): { ok: true; date: string } | { ok: false; reason: string }`
  - Parse `YYYY-MM-DD`
  - Reject if outside `[UTC today - 1 day, UTC today + 1 day]` (inclusive)
- `countFocusSlots(supabase: SupabaseClient, focusDate: string): Promise<number>`
  - Query `tasks` where `focus_date = focusDate` (RLS scopes to authenticated user)
  - Count includes completed tasks (`completed_at` ignored)
  - Propagate Supabase errors
- `checkFocusLimit(supabase: SupabaseClient, focusDate: string): Promise<FocusLimitResult>`
  - Run `validateFocusDate` first → `invalid_focus_date` if fail
  - Run `countFocusSlots` → `allowed: count < FOCUS_LIMIT`
- `isFocusLimitDbError(error: unknown): boolean` — detect trigger exception message for S-02 mapping

Use `createClient()` pattern from existing auth routes — service accepts an already-constructed Supabase client; caller responsible for auth context.

#### 3. Path alias

**File:** no change needed — `@/*` → `./src/*` already configured in `tsconfig.json`

**Intent:** Service imports use `@/lib/services/tasks` and `@/types` per repo conventions.

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Production build passes: `npm run build`

#### Manual Verification

- Import `checkFocusLimit` in a temporary REPL or ad-hoc script against local Supabase with a test user session — returns `allowed: false` when 3 tasks focused for the day
- `validateFocusDate` rejects dates 2+ days from UTC today
- `validateFocusDate` accepts today's local date string

**Implementation Note:** Pause after this phase for manual confirmation before Phase 3.

---

## Phase 3: Verification and documentation

### Overview

Confirm the full foundation works end-to-end locally and update stale documentation.

### Changes Required

#### 1. README database section

**File:** `README.md`

**Intent:** Remove the outdated claim that no migrations are required now that F-01 adds the tasks table.

**Contract:** Update the Supabase configuration section (~line 115) to note that task migrations live in `supabase/migrations/` and must be applied via `npx supabase db reset` (local) or `supabase db push` (remote).

#### 2. Optional: AGENTS.md cross-reference

**File:** `AGENTS.md` — **omit unless implementer finds a direct contradiction**

No change required; existing migration/RLS rules already apply.

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Production build passes: `npm run build`

#### Manual Verification

- Full local checklist completed:
  1. `npx supabase db reset` — migration applies without error
  2. Create two auth users; confirm task isolation
  3. Focus 3 tasks for user A on today's date; 4th rejected by direct SQL insert and by service `checkFocusLimit`
  4. README accurately describes migration requirement
- CI smoke job (on PR): `supabase start` in smoke workflow applies migration without failure

---

## Testing Strategy

### Unit Tests

No unit test suite exists (`AGENTS.md`). F-01 does not add one — service functions are thin wrappers over Supabase queries; manual + migration verification suffices for foundation.

### Integration Tests

Deferred to S-01 when task API routes exist. F-01 manual SQL checks substitute.

### Manual Testing Steps

1. Start local Supabase: `npx supabase start`
2. Apply migration: `npx supabase db reset`
3. Sign up two users via app or Studio
4. As user A, insert 3 tasks with `focus_date = current_date` via Studio — success
5. Insert 4th — expect trigger error `focus_limit_exceeded`
6. As user B, query `tasks` — see zero rows (RLS)
7. Run app with `.env` from `supabase status`; call service helpers from a scratch script if needed
8. Run `npm run lint && npx astro check && npm run build`

## Performance Considerations

Focus count query uses partial index `(user_id, focus_date) WHERE focus_date IS NOT NULL` — O(1) for ≤ 3 rows per user per day. No performance budget concerns at MVP scale.

## Migration Notes

- **Forward-only:** Supabase migrations do not auto-roll back with Worker deploy (`context/foundation/infrastructure.md`).
- **Remote apply:** After local verification, run `npx supabase db push` against the linked project before S-01 ships to production.
- **Account deletion:** `ON DELETE CASCADE` on `user_id` removes tasks when auth user deleted — supports FR-001b/S-06 without extra migration.

## References

- Roadmap F-01: `context/foundation/roadmap.md`
- PRD FR-004, FR-004a, NFR isolation: `context/foundation/prd.md`
- Schema sketch: `context/foundation/shape-notes.md` (lines 106–120)
- Supabase client pattern: `src/lib/supabase.ts`
- Migration conventions: `AGENTS.md`, `CLAUDE.md`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Database migration

#### Automated

- [x] 1.1 Migration applies cleanly: `npx supabase db reset` — 8d27688
- [x] 1.2 Linting passes: `npm run lint` — 8d27688
- [x] 1.3 Type checking passes: `npx astro check` — 8d27688
- [x] 1.4 Production build passes: `npm run build` — 8d27688

#### Manual

- [x] 1.5 Fourth focus insert fails with `focus_limit_exceeded`; cross-user RLS isolation verified — 8d27688
- [x] 1.6 UPDATE title/completed_at without changing focus_date succeeds; unset focus always succeeds — 8d27688

### Phase 2: Application contract

#### Automated

- [x] 2.1 Linting passes: `npm run lint`
- [x] 2.2 Type checking passes: `npx astro check`
- [x] 2.3 Production build passes: `npm run build`

#### Manual

- [x] 2.4 `checkFocusLimit` returns `allowed: false` at 3 focused tasks; `validateFocusDate` rejects out-of-window dates

### Phase 3: Verification and documentation

#### Automated

- [ ] 3.1 Linting passes: `npm run lint`
- [ ] 3.2 Type checking passes: `npx astro check`
- [ ] 3.3 Production build passes: `npm run build`

#### Manual

- [ ] 3.4 Full local checklist completed; README updated; smoke CI applies migration cleanly
