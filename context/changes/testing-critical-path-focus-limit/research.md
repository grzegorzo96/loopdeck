---
date: 2026-09-14T18:35:00+03:00
researcher: Composer
git_commit: 07a76a6e9239163f1730b08ff6e4da9ad6ff4a36
branch: main
repository: grzegorzo96/loopdeck
topic: "Phase 1 critical-path tests for focus limit (risks #1, #5, #6)"
tags: [research, codebase, vitest, focus-limit, integration-tests]
status: complete
last_updated: 2026-09-14
last_updated_by: Composer
---

# Research: Phase 1 critical-path tests for focus limit (risks #1, #5, #6)

**Date**: 2026-09-14T18:35:00+03:00  
**Researcher**: Composer  
**Git Commit**: [07a76a6](https://github.com/grzegorzo96/loopdeck/commit/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36)  
**Branch**: main  
**Repository**: [grzegorzo96/loopdeck](https://github.com/grzegorzo96/loopdeck)

## Research Question

Where does focus-limit enforcement live, and what is the cheapest Vitest test layout to prove risks #1 (4th focus silently accepted), #5 (completion frees slot), and #6 (backlog completion bypass) — without UI-only assertions or mirroring count logic in tests?

## Summary

Focus limit is enforced at **two layers**: application pre-check (`checkFocusLimit` in `src/lib/services/tasks.ts`) and a **DB trigger** (`enforce_focus_limit()` in the tasks migration). Three API entry points set focus: `POST /api/tasks`, `PATCH /api/tasks/:id` (`setFocus`), and `POST /api/tasks/focus/swap`. A 4th attempt returns **409** with rule copy `{ code: "focus_limit_exceeded", message: "Three for today is the whole day." }`. The UI does **not** disable add-to-focus at 3 — it reacts to server 409 by opening the swap modal.

**Risk #5** is protected: `completeTask` sets only `completed_at`, never clears `focus_date`; slot counts include completed rows at both app and DB layers.

**Risk #6** is protected at the application layer: `completeTask` rejects when `focus_date !== localDate` → **422** `complete_requires_focus`. No DB constraint on `completed_at` vs `focus_date`.

**Vitest is not configured** — zero test files, no vitest dependency. Phase 1 should bootstrap Vitest with **service-layer integration tests** against local Supabase (cheapest signal per test-plan) plus thin unit tests for `validateFocusDate`, `isFocusLimitDbError`, and `taskErrorResponse`.

## Detailed Findings

### Risk #1 — Focus limit enforcement

#### Entry points for setting focus

| Route | Method | Service function |
|-------|--------|------------------|
| `/api/tasks` | POST (`setFocus: true`) | `createTask()` |
| `/api/tasks/[id]` | PATCH (`action: "setFocus"`) | `setTaskFocus()` |
| `/api/tasks/focus/swap` | POST | `swapTaskFocus()` |

- Create handler: [`src/pages/api/tasks/index.ts`](https://github.com/grzegorzo96/loopdeck/blob/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36/src/pages/api/tasks/index.ts)
- Patch handler: [`src/pages/api/tasks/[id].ts`](https://github.com/grzegorzo96/loopdeck/blob/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36/src/pages/api/tasks/[id].ts)
- Swap handler: [`src/pages/api/tasks/focus/swap.ts`](https://github.com/grzegorzo96/loopdeck/blob/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36/src/pages/api/tasks/focus/swap.ts)
- Business logic: [`src/lib/services/task-queries.ts`](https://github.com/grzegorzo96/loopdeck/blob/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36/src/lib/services/task-queries.ts)

#### Dual-layer enforcement

**Application layer** — `checkFocusLimit()` counts rows with `focus_date = date` (no `completed_at` filter), rejects at `>= FOCUS_LIMIT` (3):

```51:71:src/lib/services/tasks.ts
export async function checkFocusLimit(supabase: SupabaseClient, focusDate: string): Promise<FocusLimitResult> {
  // ...
  const currentCount = await countFocusSlots(supabase, validation.date);

  if (currentCount >= FOCUS_LIMIT) {
    return {
      allowed: false,
      currentCount,
      limit: FOCUS_LIMIT,
      reason: "focus_limit_exceeded",
    };
  }
```

Called before write in `createTask` (when `setFocus`) and `setTaskFocus`. **Not** called in `swapTaskFocus` (relies on unset-first + trigger).

**Database layer** — `enforce_focus_limit()` trigger on `BEFORE INSERT OR UPDATE OF focus_date`, advisory lock, cap = 3 per `(user_id, focus_date)`:

- [`supabase/migrations/20260914154000_create_tasks.sql`](https://github.com/grzegorzo96/loopdeck/blob/07a76a6e9239163f1730b08ff6e4da9ad6ff4a36/supabase/migrations/20260914154000_create_tasks.sql) — function + trigger

DB errors normalized via `isFocusLimitDbError()` → thrown as `focus_limit_exceeded`.

#### Error shape (4th focus)

```4:8:src/lib/api/task-errors.ts
  focus_limit_exceeded: {
    status: 409,
    code: "focus_limit_exceeded",
    message: "Three for today is the whole day.",
  },
```

#### Swap flow

`swapTaskFocus` sequence: validate date → fetch both tasks → verify `taskId` not in focus → verify `swapOutId` in today's focus → unset `swapOutId` → set `taskId` focus → return `{ focus, backlog }`.

Swap-specific errors: `already_in_focus`, `swap_out_not_in_focus` (both 409).

#### UI vs server authority

- **No preemptive disable** at 3 tasks in `BacklogPanel` — "Add to focus" always enabled.
- `TaskApp` opens swap modal on `err.code === "focus_limit_exceeded"` after server 409.
- **Server is authoritative** — tests must hit API/service layer, not assert UI disabled state.

### Risk #5 — Completion does not free slot

**`focus_date` unchanged on complete** — only `completed_at` is written:

```125:137:src/lib/services/task-queries.ts
  if (task.focus_date !== localDate) {
    throw new Error("complete_requires_focus");
  }
  // ...
  const result = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
```

**Slot count includes completed rows** — `countFocusSlots` and DB trigger count by `focus_date` only, no `completed_at` filter.

**Trigger scope** — fires only on `INSERT` or `UPDATE OF focus_date`; completing a task does not touch `focus_date`.

**Protection status**: Implemented in code at three layers (completion path, app check, DB trigger). **Not yet protected by automated tests.**

### Risk #6 — Backlog completion rejected

**Guard** in `completeTask`: `focus_date !== localDate` → throws `complete_requires_focus`. Rejects:
- `focus_date IS NULL` (pure backlog)
- Past focus (`focus_date < localDate`)
- Future focus mismatch

**Error shape**:

```14:18:src/lib/api/task-errors.ts
  complete_requires_focus: {
    status: 422,
    code: "complete_requires_focus",
    message: "Complete a task only from today's focus.",
  },
```

**UI**: Done button only in `FocusPanel`; `BacklogPanel` has no complete affordance.

**Gap**: No DB constraint — RLS update policy is ownership-only. Direct Supabase client could bypass. Tests should hit `PATCH /api/tasks/[id]` or `completeTask` service function.

**FR-005b / US-04**: Implemented and impl-review approved (`context/changes/complete-in-focus/`).

### Test infrastructure (Vitest bootstrap)

| Check | Result |
|-------|--------|
| `vitest.config.*` | None |
| `vitest` in devDependencies | Absent |
| `*.test.ts` / `*.spec.ts` | 0 files |
| Existing verification | `npm run smoke` only |

**Recommended Phase 1 layout**:

```
tests/
  helpers/supabase.ts       # createTestUser(), cleanup
  shims/astro-env-server.ts # process.env shim for astro:env/server
  unit/services/tasks.test.ts
  unit/api/task-errors.test.ts
  integration/services/focus-limit.test.ts
vitest.config.ts
```

**Cheapest integration layer**: Service functions in `task-queries.ts` + real Supabase client (RLS + trigger). Defer full HTTP handler tests until service layer is covered.

**Local Supabase pattern** (reuse from CI smoke job):
1. `supabase start`
2. Export `API_URL`, `ANON_KEY`, `SERVICE_ROLE_KEY` from `supabase status -o env`
3. Authenticated client via `signUp`/`signInWithPassword` or admin `createUser`
4. `supabase db reset` for clean slate between runs

**Unit-test candidates** (cheap, high signal):
- `validateFocusDate()` — format, calendar validity, ±1 day window (`vi.useFakeTimers()`)
- `isFocusLimitDbError()` — Postgres P0001 mapping
- `taskErrorResponse()` — status codes + JSON shape

## Code References

- `src/types.ts:10` — `FOCUS_LIMIT = 3`
- `src/lib/services/tasks.ts:16-36` — `validateFocusDate`
- `src/lib/services/tasks.ts:38-49` — `countFocusSlots`
- `src/lib/services/tasks.ts:51-79` — `checkFocusLimit`
- `src/lib/services/tasks.ts:85-111` — `isFocusLimitDbError`
- `src/lib/services/task-queries.ts:35-69` — `createTask`
- `src/lib/services/task-queries.ts:71-96` — `setTaskFocus`
- `src/lib/services/task-queries.ts:118-140` — `completeTask`
- `src/lib/services/task-queries.ts:153-202` — `swapTaskFocus`
- `src/lib/api/task-errors.ts:3-44` — error map + `taskErrorResponse`
- `supabase/migrations/20260914154000_create_tasks.sql` — `enforce_focus_limit()` trigger
- `src/components/tasks/TaskApp.tsx` — 409 → swap modal (reactive, not authoritative)
- `src/components/tasks/BacklogPanel.tsx` — no disable at 3
- `src/components/tasks/FocusPanel.tsx` — Done button (focus-only completion UI)
- `scripts/smoke.mjs` — cookie-jar HTTP pattern for future full-stack tests
- `.github/workflows/ci.yml` — supabase start + env extraction for CI

## Architecture Insights

1. **Dual enforcement** — App pre-check for fast feedback; DB trigger for race/concurrency safety. Integration tests against real DB prove both.
2. **Completed slots count** — FR-004a semantics: completion holds slot until day reset. Count logic never filters `completed_at`.
3. **Swap bypasses pre-check** — Unset-then-set sequence relies on trigger after unset frees one slot. Test swap as distinct path from 4th-focus refusal.
4. **Server-authoritative limit** — UI intentionally allows 4th attempt to surface swap flow. "UI disable is enough" is a false assumption to challenge in tests.
5. **Service-layer testing preferred** — Avoids Astro `APIContext`/cookie/auth wiring in Phase 1; same business logic as HTTP routes.

## Historical Context (from prior changes)

- `context/changes/focus-limit-and-swap/plan.md` — Swap API + modal; server returns 409 on 4th focus; completed tasks valid swap-out targets.
- `context/changes/complete-in-focus/plan.md` — Completion must not clear `focus_date`; impl-review APPROVED.
- `context/changes/task-schema-rls/plan.md` — Focus count = `COUNT(*) WHERE focus_date = ?` including completed rows.
- `context/foundation/test-plan.md` §2–§3 — Phase 1 scope, risk response guidance, anti-patterns.

## Integration Test Scenarios (planned)

### Risk #1 — 4th focus refused

1. Auth as test user; `localDate` within ±1 day.
2. Create/focus 3 tasks via `createTask` or `setTaskFocus`.
3. 4th focus attempt (create with `setFocus: true` OR patch `setFocus`) → **409** `{ code: "focus_limit_exceeded", message: "Three for today is the whole day." }`.
4. `listTasks` → `focus.length === 3`.

### Risk #1 — Swap works

1. Setup: 3 focused + 1 backlog.
2. `swapTaskFocus({ taskId, swapOutId, localDate })` → 200.
3. Assert response lists: still 3 in focus, swapped task present, removed task in backlog.

### Risk #5 — Completion holds slot

1. Focus 3 tasks; complete one via `completeTask`.
2. Assert `focus_date` unchanged, `completed_at` set.
3. 4th focus attempt → still **409**.
4. `listTasks` → `focus.length === 3`.
5. **Negative control**: `unsetTaskFocus` on one → 4th focus succeeds (proves limit is about `focus_date`, not completion UI state).

### Risk #6 — Backlog complete rejected

1. Create task with `setFocus: false`.
2. `completeTask` on backlog task → throws `complete_requires_focus` (or PATCH → **422**).
3. Assert `{ code: "complete_requires_focus", message: "Complete a task only from today's focus." }`.
4. Task still in backlog, `completed_at` null.
5. **Control**: setFocus → complete → **200**.

### Anti-patterns (must avoid)

| Anti-pattern | Do instead |
|--------------|------------|
| Assert UI button disabled at 3 | Hit API/service; expect 409 |
| Mirror `FOCUS_LIMIT` / count in test oracle | Drive 4 operations; assert 409 + GET/list length |
| Mock Supabase | Real local DB so trigger fires |
| Only test focus completion path (#6) | Explicitly PATCH complete on backlog task |
| Test completion UI without slot assertion (#5) | After complete, 4th focus must still 409 |

## Related Research

- `context/foundation/test-plan.md` — master rollout strategy
- `context/changes/focus-limit-and-swap/plan.md` — swap implementation spec
- `context/changes/complete-in-focus/plan.md` — completion semantics

## Open Questions

1. **Vitest + Astro env shim** — Confirm alias strategy for `astro:env/server` if handler-import tests are added in Phase 1 vs deferred.
2. **Test isolation** — Per-test user cleanup vs `supabase db reset` in global setup (speed vs isolation tradeoff).
3. **CI wiring** — Phase 4 adds unit/integration to CI; Phase 1 plan should note local-only vs prepare CI job scaffold.
4. **Direct Supabase bypass (#6 gap)** — Accept application-layer proof for Phase 1, or add negative test documenting the RLS gap as known limitation?
