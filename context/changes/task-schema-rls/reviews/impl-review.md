<!-- IMPL-REVIEW-REPORT -->
# Implementation Review: Task schema with RLS and focus-count contract

- **Plan**: context/changes/task-schema-rls/plan.md
- **Scope**: All 3 phases
- **Date**: 2026-09-14
- **Verdict**: NEEDS ATTENTION
- **Findings**: 0 critical, 1 warning, 3 observations

## Verdicts

| Dimension | Verdict |
|-----------|---------|
| Plan Adherence | PASS |
| Scope Discipline | PASS |
| Safety & Quality | WARNING |
| Architecture | PASS |
| Pattern Consistency | PASS |
| Success Criteria | PASS |

## Automated Verification (re-run)

| Command | Result | Notes |
|---------|--------|-------|
| `npx supabase db reset` | PASS | `20260914154000_create_tasks.sql` applies cleanly |
| `npm run lint` (repo-wide) | FAIL | Unrelated regression in `src/lib/supabase-admin.ts:9` (post-MVP commit) |
| `npx eslint src/types.ts src/lib/services/tasks.ts` | PASS | task-schema-rls source files clean |
| `npx astro check` | PASS | 0 errors |
| `npm run build` | PASS | Server build complete |

## Findings

### F1 — Concurrent focus assignment race

- **Severity**: ⚠️ WARNING
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260914154000_create_tasks.sql:61-71
- **Detail**: The focus-limit trigger uses `COUNT(*)` without row-level locking. Two concurrent transactions can both observe `count < 3` before either commits, allowing a fourth focused task. The same TOCTOU applies to the TypeScript pre-check in `checkFocusLimit()` followed by an insert.
- **Fix A ⭐ Recommended**: Add per-user/day serialization in the trigger via `pg_advisory_xact_lock(hashtext(NEW.user_id::text || NEW.focus_date::text))` before the count query.
  - Strength: Closes the race at the data layer where the hard limit must hold; minimal API surface change.
  - Tradeoff: Slight contention under concurrent writes for the same user/day — acceptable at MVP scale.
  - Confidence: HIGH — standard Postgres pattern for counter enforcement.
  - Blind spot: Haven't load-tested advisory lock behavior under Supabase connection pooling.
- **Fix B**: Document as known MVP limitation; rely on sequential client UX only.
  - Strength: Zero migration change; acceptable for single-tab usage.
  - Tradeoff: Limit can be violated under concurrent API calls or multi-tab use.
  - Confidence: MEDIUM — depends on expected concurrency patterns.
  - Blind spot: S-02 swap flow uses two writes and may widen the race window.
- **Decision**: FIXED via Fix A — advisory lock added to trigger migration

### F2 — validateFocusDate accepts tomorrow within ±1 window

- **Severity**: 👁 OBSERVATION
- **Impact**: 🔎 MEDIUM — real tradeoff; pause to reason through it
- **Dimension**: Architecture
- **Location**: src/lib/services/tasks.ts:28-33
- **Detail**: `validateFocusDate` accepts UTC today ± 1 day per shape-notes (timezone travel). PRD open question 2 working decision is "no focus for tomorrow." A client can submit tomorrow's date when within the window.
- **Fix**: Accept as documented tradeoff for F-01; tighten validation in S-01 when local-date semantics are enforced end-to-end.
- **Decision**: ACCEPTED — documented tradeoff per shape-notes; defer tightening to S-01

### F3 — isFocusLimitDbError relies on message substring

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: src/lib/services/tasks.ts:81-94
- **Detail**: Limit detection checks `error.message.includes("focus_limit_exceeded")` only. Does not inspect SQLSTATE `P0001` or Supabase/PostgREST error codes. Fragile if error formatting changes.
- **Fix**: Prefer checking Supabase error `code`/`details` when available; fall back to message match.
- **Decision**: FIXED — checks P0001 + message/details with message fallback

### F4 — No title length constraint at DB layer

- **Severity**: 👁 OBSERVATION
- **Impact**: 🏃 LOW — quick decision; fix is obvious and narrowly scoped
- **Dimension**: Safety & Quality
- **Location**: supabase/migrations/20260914154000_create_tasks.sql:6
- **Detail**: `title text NOT NULL` has no length limit. Very large titles are possible at the storage layer. Plan deferred title validation to S-01 API routes.
- **Fix**: Add `CHECK (char_length(title) <= N)` in S-01 when HTTP validation lands, or in a follow-up migration.
- **Decision**: FIXED — added `CHECK (char_length(title) <= 500)` aligned with S-01 zod schema
