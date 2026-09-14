# Task schema with RLS and focus-count contract — Plan Brief

> Full plan: `context/changes/task-schema-rls/plan.md`

## What & Why

Loopdeck's product is a hard limit of three tasks per day. Before any capture-to-focus UI (S-01), the data layer must exist: a `tasks` table with per-user isolation, and a server-side contract that counts focus slots correctly — including completed tasks that still hold their slot (FR-004a).

## Starting Point

The codebase is auth-only: Supabase SSR client and middleware attach `User` to `Astro.locals`, but there are no migrations, no `src/types.ts`, and no task service layer. Schema fields are pre-specified in `context/foundation/shape-notes.md`.

## Desired End State

After this change, a developer can import typed helpers from `src/lib/services/tasks.ts` to validate a client-supplied local date, count focus slots for a day, and know whether a fourth focus is allowed — with Postgres enforcing the same rule as a backstop. S-01 builds task CRUD and UI on this foundation without redefining the limit.

## Key Decisions Made

| Decision | Choice | Why (1 sentence) | Source |
| -------- | ------ | ---------------- | ------ |
| Enforcement layer | TypeScript service + Postgres trigger | Service gives S-02 typed refusal; trigger closes race window and satisfies PRD data-layer enforcement | Plan |
| F-01 deliverables | Migration + types + service module | Roadmap outcome fully landed without overlapping S-01 API/UI scope | Plan |
| Focus count rule | All rows with `focus_date = day` (completed included) | Matches FR-004a — finishing does not free a slot | PRD |
| Local date guard | ±1 day from UTC in service | Shape-notes rule ships with the contract S-01 will call | Plan |
| Table name | `tasks` (plural) | Standard Supabase/Postgres convention | Plan |
| RLS granularity | Separate SELECT/INSERT/UPDATE/DELETE policies | Matches AGENTS.md hard rule | Plan |
| Verification | `supabase db reset` + lint + build | Matches current CI gates; no new automation in F-01 | Plan |

## Scope

**In scope:**

- First Supabase migration: `tasks` table, indexes, RLS, focus-limit trigger
- `src/types.ts` Task entity aligned to migration columns
- `src/lib/services/tasks.ts` focus-count and date-validation contract
- README update (remove stale auth-only DB note)

**Out of scope:**

- Task HTTP API routes (`/api/tasks/*`) — S-01
- React/Astro UI — S-01
- Swap/refusal UX — S-02
- Metrics events — S-07
- Supabase type codegen
- Automated SQL verification script

## Architecture / Approach

```
Client (S-01+) ──► src/lib/services/tasks.ts ──► Supabase client (user session)
                         │                              │
                         │ count + date validate        │ RLS: auth.uid() = user_id
                         ▼                              ▼
                   FocusLimitResult              tasks table
                                                         │
                                              BEFORE INSERT/UPDATE trigger
                                              (reject 4th focus_date assignment)
```

The service is the primary contract downstream slices import. The trigger mirrors the same count logic so concurrent writes cannot bypass the limit.

## Phases at a Glance

| Phase | What it delivers | Key risk |
| ----- | ---------------- | -------- |
| 1. Database migration | `tasks` table, indexes, per-op RLS, focus-limit trigger | Trigger must exclude current row on UPDATE; swap (S-02) needs atomic unset+set |
| 2. Application contract | `src/types.ts` + focus-count service with date validation | Service count logic must match trigger exactly |
| 3. Verification & docs | Local migration apply, lint/build pass, README fix | CI smoke job will apply migration on `supabase start` — broken SQL fails CI |

**Prerequisites:** Local Docker for `npx supabase start`; existing auth baseline unchanged.

**Estimated effort:** ~1 session across 3 phases.

## Open Risks & Assumptions

- Swap in S-02 requires a transaction (unset slot A, set slot B) — F-01 trigger allows this if count stays ≤ 3 mid-transaction; document for S-01 implementer.
- CI main job does not run `db reset`; migration correctness relies on local verification + smoke job's `supabase start`.
- `title` length/uniqueness not constrained in MVP — empty-title rejection is S-01 API concern.

## Success Criteria (Summary)

- Migration applies cleanly on fresh local Supabase
- RLS prevents cross-user task access
- Fourth focus assignment rejected by both service check and DB trigger
- `npm run lint`, `npx astro check`, and `npm run build` pass
