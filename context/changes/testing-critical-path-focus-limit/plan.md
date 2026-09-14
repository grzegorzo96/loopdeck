# Critical-path focus limit tests — Implementation Plan

## Overview

Bootstrap Vitest for Loopdeck and add unit + integration tests that prove focus-limit risks #1, #5, and #6 at the cheapest layer: **service functions against local Supabase** (RLS + DB trigger), without UI assertions or mirrored count logic.

This is test-plan rollout Phase 1 (`context/foundation/test-plan.md` §3).

## Current State Analysis

- **Zero automated tests** — no Vitest dependency, no `*.test.ts` files; only `npm run smoke` (HTTP auth flow).
- **Focus limit is implemented** at app layer (`checkFocusLimit` in `src/lib/services/tasks.ts`) and DB trigger (`enforce_focus_limit()` in `supabase/migrations/20260914154000_create_tasks.sql`).
- **Three focus-set paths**: `createTask` (setFocus), `setTaskFocus`, `swapTaskFocus` in `src/lib/services/task-queries.ts`.
- **Completion holds slots** — `completeTask` sets only `completed_at`; counts include completed rows.
- **Backlog completion blocked** — `completeTask` throws `complete_requires_focus` when `focus_date !== localDate` (app layer only; no DB constraint).

### Key Discoveries:

- UI does **not** disable add-to-focus at 3 — server 409 is authoritative (`src/components/tasks/BacklogPanel.tsx`).
- Integration tests should call `task-queries.ts` directly with an authenticated Supabase client — avoids Astro `APIContext` / `astro:env/server` wiring.
- Test helpers should read `SUPABASE_*` from `process.env` (populated via `supabase status -o env`); do **not** import `createAdminClient` from `src/lib/supabase-admin.ts` (pulls `astro:env/server`).
- CI integration deferred to test-plan Phase 4; Phase 1 adds local npm scripts only.

## Desired End State

- `npm run test:unit` passes without Supabase (pure logic).
- `npm run test:integration` passes with local Supabase running and env vars exported.
- Integration suite proves:
  - **#1**: 4th focus refused on both create-with-focus and patch setFocus paths; swap works; state stays at 3 focus tasks.
  - **#5**: After completing a focus task, 4th focus still blocked; swap-out of completed task succeeds; unset frees a slot (negative control).
  - **#6**: Backlog `completeTask` throws `complete_requires_focus`; focus-then-complete succeeds.
- `context/foundation/test-plan.md` §6 cookbook filled for unit + integration patterns.

### Verification

```bash
npx supabase start
eval "$(supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
export SUPABASE_URL=$API_URL SUPABASE_KEY=$ANON_KEY SUPABASE_SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
npm run test:run
npm run lint
npx astro check
npm run build
```

## What We're NOT Doing

- HTTP/API route handler tests (deferred — service layer chosen for Phase 1).
- UI or browser tests (no Playwright; no cursor-ide-browser for this change).
- CI job wiring (test-plan Phase 4).
- Risk #2 isolation, #3 migration, #4/#7 day lifecycle (later rollout phases).
- DB-level test proving RLS cannot set `completed_at` on backlog tasks directly (known gap — app layer only for #6).
- Mirroring `FOCUS_LIMIT` or reimplementing count logic in test oracles — assert via operations + `listTasks` length.
- E2e extension of `scripts/smoke.mjs`.

## Implementation Approach

1. Install Vitest; configure path alias `@/*` and separate **unit** vs **integration** projects (integration requires env vars, fails fast with clear message if Supabase unreachable).
2. Add test helpers: `createTestUser()` (service role create + anon sign-in), `todayLocalDate()` (en-CA format within `validateFocusDate` window), task cleanup in `afterAll`.
3. Unit-test pure functions: `validateFocusDate`, `isFocusLimitDbError`, `taskErrorResponse`.
4. Integration-test `task-queries.ts` scenarios per risk, using **fresh user per test file** for isolation.
5. Update test-plan cookbook §6.1, §6.2, §6.4 and §6.6 with shipped patterns.

## Critical Implementation Details

**Assertion style for service-layer integration:** Service functions throw `Error` with message equal to reason codes (`focus_limit_exceeded`, `complete_requires_focus`). Assert `rejects.toThrow("focus_limit_exceeded")` and verify state via `listTasks` — do not import `FOCUS_LIMIT` as test oracle. Slot count assertions use `listTasks(...).focus.length` after a fixed sequence of operations (3 succeeds, 4th fails → length still 3).

**Per-user isolation:** Each integration test file creates its own user in `beforeAll`; deletes created tasks (and optionally user) in `afterAll`. No `supabase db reset` in Phase 1.

## Phase 1: Vitest Bootstrap & Test Harness

### Overview

Install Vitest, configure projects, add npm scripts, and create Supabase test helpers.

### Changes Required:

#### 1. Vitest dependency and config

**File**: `package.json`, `vitest.config.ts` (new)

**Intent**: Add Vitest with `@/*` path alias matching `tsconfig.json`; split unit (no DB) and integration (requires `SUPABASE_URL` + keys) projects.

**Contract**: New devDependency `vitest`. Scripts: `test` (watch), `test:run` (CI-local once), `test:unit`, `test:integration`. Integration project globalSetup or `beforeAll` guard: skip/fail with message `"Start Supabase: npx supabase start && export env from supabase status"` when env missing.

#### 2. Test helpers

**File**: `tests/helpers/supabase.ts` (new), `tests/helpers/dates.ts` (new)

**Intent**: Encapsulate authenticated client creation and date fixture for focus operations.

**Contract**: `createTestUser()` returns `{ userId, client, email }` using `process.env.SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. `todayLocalDate()` returns `YYYY-MM-DD` string valid for `validateFocusDate`. Helpers use `@supabase/supabase-js` directly — no imports from `astro:env/server`.

#### 3. Environment documentation

**File**: `README.md` or comment in `vitest.config.ts` (minimal — prefer vitest config comment block)

**Intent**: Document prerequisite: local Supabase + env export before `test:integration`.

**Contract**: One-line pointer in vitest integration project config comment; no new markdown file.

### Success Criteria:

#### Automated Verification:

- `npm install` succeeds with vitest in devDependencies
- `npm run test:unit -- --passWithNoTests` runs without Supabase (may be empty until Phase 2)
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- With Supabase running and env exported, `npm run test:integration -- --passWithNoTests` executes without config errors

**Implementation Note**: Pause for manual confirmation after Phase 1 before Phase 2.

---

## Phase 2: Unit Tests (Pure Logic)

### Overview

Add fast unit tests for date validation, DB error mapping, and API error response shapes — no database required.

### Changes Required:

#### 1. Service helpers unit tests

**File**: `tests/unit/services/tasks.test.ts` (new)

**Intent**: Lock behavior of `validateFocusDate` and `isFocusLimitDbError` used by focus-limit paths.

**Contract**: Cover: valid today; invalid format; invalid calendar date (e.g. 2026-02-30); date outside ±1 day window (use `vi.useFakeTimers()`); `isFocusLimitDbError` for P0001 object, Error message string, non-matching errors.

#### 2. Error mapping unit tests

**File**: `tests/unit/api/task-errors.test.ts` (new)

**Intent**: Assert HTTP status + JSON body for `focus_limit_exceeded`, `complete_requires_focus`, and unknown reason fallback.

**Contract**: Parse `taskErrorResponse(reason)` Response: status + `{ code, message }` for each mapped reason in `src/lib/api/task-errors.ts`.

### Success Criteria:

#### Automated Verification:

- `npm run test:unit` passes
- `npm run lint` passes
- `npx astro check` passes

#### Manual Verification:

- None required

**Implementation Note**: Pause for manual confirmation after Phase 2 before Phase 3.

---

## Phase 3: Focus-Limit Integration Tests & Cookbook

### Overview

Prove risks #1, #5, #6 via service-layer sequences against real Supabase; update test-plan cookbook.

### Changes Required:

#### 1. Focus-limit integration suite

**File**: `tests/integration/services/focus-limit.test.ts` (new)

**Intent**: Single integration file with describe blocks per risk; fresh user in `beforeAll`.

**Contract**: Use `createTask`, `setTaskFocus`, `unsetTaskFocus`, `completeTask`, `swapTaskFocus`, `listTasks` from `src/lib/services/task-queries.ts`. Shared `localDate` from `todayLocalDate()`.

**Risk #1 scenarios:**
- **Create path**: 3× `createTask({ setFocus: true })` succeed; 4th `createTask({ setFocus: true })` throws `focus_limit_exceeded`; `listTasks` → `focus.length === 3`.
- **Patch path**: 4× `createTask({ setFocus: false })`; 3× `setTaskFocus` succeed; 4th `setTaskFocus` throws `focus_limit_exceeded`; `listTasks` → `focus.length === 3`.
- **Swap at limit**: With 3 focused + 1 backlog, `swapTaskFocus` succeeds; `listTasks` → 3 focus, swapped task in focus, swap-out in backlog.

**Risk #5 scenarios:**
- Focus 3 tasks; `completeTask` on one → `completed_at` set, `focus_date` unchanged.
- 4th `setTaskFocus` still throws `focus_limit_exceeded`; `listTasks` → `focus.length === 3`.
- `swapTaskFocus` swapping **out the completed task** succeeds; still 3 in focus.
- **Negative control**: `unsetTaskFocus` on one task → `setTaskFocus` on backlog succeeds (proves limit tracks `focus_date`, not completion UI).

**Risk #6 scenarios:**
- `createTask({ setFocus: false })` → `completeTask` throws `complete_requires_focus`; task remains in backlog (`completed_at` null).
- **Control**: `setTaskFocus` then `completeTask` succeeds; task in focus with `completed_at` set.

**Anti-patterns enforced in review:** No `FOCUS_LIMIT` import for assertions; no component imports; no mocked Supabase client.

#### 2. Test-plan cookbook update

**File**: `context/foundation/test-plan.md`

**Intent**: Replace §6.1, §6.2, §6.4 TBD stubs with concrete patterns; add §6.6 note for Phase 1; set §4 Vitest version from installed package.

**Contract**: Document file paths, npm scripts, Supabase prerequisite, and assertion style (operations + list length, not mirrored count logic).

#### 3. Change status

**File**: `context/changes/testing-critical-path-focus-limit/change.md`

**Intent**: Mark change ready for implementation tracking.

**Contract**: `status: planned` (set when plan lands; `/10x-implement` advances to `implementing`).

### Success Criteria:

#### Automated Verification:

- `npm run test:integration` passes with local Supabase + env vars
- `npm run test:run` passes (unit + integration)
- `npm run lint` passes
- `npx astro check` passes
- `npm run build` passes

#### Manual Verification:

- Read integration test output — each risk scenario named and green
- Spot-check: tests fail clearly when Supabase is stopped (helpful error message)

**Implementation Note**: After Phase 3, human confirms integration tests ran against real local Supabase before archiving this change.

---

## Testing Strategy

### Unit Tests

- `validateFocusDate` — format, calendar validity, ±1 day window with fake timers
- `isFocusLimitDbError` — Postgres P0001 and message variants
- `taskErrorResponse` — status codes and JSON shapes for focus-limit errors

### Integration Tests

- Service-layer sequences only; real Supabase; one user per file
- Risks #1, #5, #6 as specified in Phase 3
- State oracle: `listTasks` focus array length after operation sequences

### Manual Testing Steps

1. Stop Supabase → `npm run test:integration` → confirm fail-fast message
2. Start Supabase, export env → full suite green
3. Optionally break `completeTask` guard locally → confirm Risk #6 test catches regression

## Performance Considerations

- Per-user isolation avoids slow `db reset` per run; integration suite should complete in under 30s locally.
- Unit tests run in milliseconds; keep integration file count minimal (one file for Phase 1).

## Migration Notes

Not applicable — test-only change; no schema or production code modifications unless a bug is discovered during test authoring (fix in separate change).

## References

- Research: `context/changes/testing-critical-path-focus-limit/research.md`
- Test plan: `context/foundation/test-plan.md`
- Focus limit implementation: `src/lib/services/task-queries.ts`, `src/lib/services/tasks.ts`
- DB trigger: `supabase/migrations/20260914154000_create_tasks.sql`
- CI Supabase pattern: `.github/workflows/ci.yml` (smoke job — reference for Phase 4)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Vitest Bootstrap & Test Harness

#### Automated

- [x] 1.1 `npm install` succeeds with vitest in devDependencies
- [x] 1.2 `npm run test:unit -- --passWithNoTests` runs without Supabase
- [x] 1.3 `npm run lint` passes
- [x] 1.4 `npx astro check` passes
- [x] 1.5 `npm run build` passes

#### Manual

- [ ] 1.6 Integration project runs without config errors when Supabase + env are set

### Phase 2: Unit Tests (Pure Logic)

#### Automated

- [x] 2.1 `npm run test:unit` passes
- [x] 2.2 `npm run lint` passes
- [x] 2.3 `npx astro check` passes

### Phase 3: Focus-Limit Integration Tests & Cookbook

#### Automated

- [x] 3.1 `npm run test:integration` passes with local Supabase + env vars
- [x] 3.2 `npm run test:run` passes
- [x] 3.3 `npm run lint` passes
- [x] 3.4 `npx astro check` passes
- [x] 3.5 `npm run build` passes

#### Manual

- [ ] 3.6 Integration output shows all risk scenarios green against real Supabase
- [ ] 3.7 Stopped Supabase produces clear fail-fast message
