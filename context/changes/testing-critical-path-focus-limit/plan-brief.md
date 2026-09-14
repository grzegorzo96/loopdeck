# Critical-path focus limit tests — Plan Brief

> Full plan: `context/changes/testing-critical-path-focus-limit/plan.md`
> Research: `context/changes/testing-critical-path-focus-limit/research.md`

## What & Why

Bootstrap Vitest and prove the 3-task focus cap at the cheapest test layer — covering test-plan risks #1 (4th focus accepted), #5 (completion frees slot), and #6 (backlog completion bypass). Tests must challenge false assumptions ("UI disable is enough", "complete frees capacity") without mirroring count logic or asserting UI state.

## Starting Point

Loopdeck has dual focus-limit enforcement (app pre-check + DB trigger) and zero automated tests. Research mapped all entry points and error shapes; only `npm run smoke` exists today.

## Desired End State

Developers run `npm run test:run` locally (unit + integration) with Supabase started. Integration tests call `task-queries.ts` service functions with real DB and prove all three risks. Test-plan §6 cookbook documents how to add future tests.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
|----------|--------|------------------|--------|
| Integration layer | Service functions only | Cheapest signal — hits RLS + trigger without Astro auth wiring | Plan |
| Test isolation | Fresh user per test file | Fast local runs; no db reset overhead | Plan |
| CI scope | Local scripts only | Matches test-plan Phase 4 deferral | Plan |
| Risk #1 paths | Create + patch setFocus | Covers both `checkFocusLimit` call sites | Plan |
| Risk #5 depth | Block 4th + swap completed out | Proves slot held AND FR-004a swap-out target | Plan |
| Risk #6 scope | App layer only | Matches product API path; RLS gap documented as out of scope | Plan |

## Scope

**In scope:** Vitest config, test helpers, unit tests (date/error helpers), integration tests for #1/#5/#6, npm scripts, test-plan cookbook update.

**Out of scope:** HTTP route tests, UI/e2e, CI wiring, risks #2–#4/#7, direct-Supabase RLS bypass test for #6.

## Architecture / Approach

Vitest with two projects: **unit** (no DB) and **integration** (requires `SUPABASE_*` env from `supabase status`). Helpers create users via service role + sign in with anon key. Integration tests drive sequences of `createTask` / `setTaskFocus` / `completeTask` / `swapTaskFocus`, assert thrown reason codes and `listTasks().focus.length` — never import `FOCUS_LIMIT` as oracle.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|-------|------------------|----------|
| 1. Vitest bootstrap | Config, helpers, npm scripts | Astro env leak if helpers import server modules |
| 2. Unit tests | validateFocusDate, isFocusLimitDbError, taskErrorResponse | Fake timer flakiness on date tests |
| 3. Integration + cookbook | Risk #1/#5/#6 proofs, test-plan §6 | Supabase not running → unclear errors |

**Prerequisites:** Docker + `npx supabase start`; Node 22; existing migrations applied.

**Estimated effort:** ~1–2 sessions across 3 phases.

## Open Risks & Assumptions

- `SUPABASE_SERVICE_ROLE_KEY` must be available locally (from `supabase status`); `.dev.vars` may need updating for integration runs outside Vitest's process.env.
- Service-layer tests won't catch HTTP-only regressions (e.g. route forgets to map error) — accepted for Phase 1.
- Per-user cleanup must be reliable; leaked test users are low impact locally.

## Success Criteria (Summary)

- `npm run test:run` green with local Supabase
- 4th focus refused on create and patch paths with rule error; swap works; focus stays at 3
- Completed focus task holds slot; swap-out completed works; backlog complete rejected
