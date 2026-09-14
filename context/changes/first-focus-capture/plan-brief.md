# First focus capture — Plan Brief

> Full plan: `context/changes/first-focus-capture/plan.md`
> Prerequisite: `context/changes/task-schema-rls/plan.md`

## What & Why

North star slice (S-01): a logged-in user adds a task and sets it as today's focus in one flow, sees the backlog newest-first, and reads the "3 for today" rule on empty state — proving the activation hypothesis.

## Starting Point

After F-01: `tasks` table, RLS, focus-count service. Dashboard is a placeholder (`src/pages/dashboard.astro`). Auth works; no task API or UI.

## Desired End State

Dashboard is the product: add-and-focus form, today's focus list (up to 3), backlog list, empty state with FR-008 copy. JSON task API with zod validation and `localDate` on every request.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| API style | JSON `Response.json()` + zod | Task routes need structured errors; establishes pattern for S-02+ | Plan |
| Capture flow | `POST /api/tasks` with `setFocus: true` | One request = add + focus (US-01) | PRD |
| Local date | Client sends `localDate` (YYYY-MM-DD) on all task calls | Shape-notes + F-01 contract | F-01 |
| 4th focus UX | Generic 409 until S-02 | S-01 covers under-limit; swap polish is S-02 | Roadmap |
| App surface | Replace dashboard placeholder | Single protected route for MVP | Plan |
| Empty state | One sentence rule before first task (FR-008) | Whole onboarding per PRD | PRD |

## Scope

**In:** Task API (list, create, patch focus), dashboard UI, zod + `prerender = false`, add `zod` dependency.

**Out:** Swap modal (S-02), complete (S-03), day-reset logic beyond query filter (S-04), delete (S-05), metrics (S-07).

## Architecture / Approach

React island `TaskApp` on SSR dashboard loads tasks via `GET /api/tasks?localDate=`. Add form POSTs title + `setFocus: true`. Focus toggle PATCHes `focus_date`. Service layer wraps Supabase + F-01 `checkFocusLimit`.

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Task API | CRUD endpoints + auth guard + zod | API auth not in middleware — must check in handler |
| 2. Dashboard UI | TaskApp, empty state, focus/backlog | Client localDate must match server validation |
| 3. Verification | lint/build + manual flow + smoke still passes | Smoke doesn't cover tasks yet |

**Prerequisites:** F-01 implemented. **Effort:** ~2 sessions, 3 phases.

## Open Risks & Assumptions

- Title validation: non-empty trim, max length TBD (~500 chars reasonable default).
- `/dashboard` stays protected route; consider renaming to `/app` later — out of scope.

## Success Criteria (Summary)

- User adds task + focus in one action on empty dashboard
- Backlog shows newest first; focus shows up to 3 tasks for today
- Empty state shows rule sentence; lint/check/build pass
