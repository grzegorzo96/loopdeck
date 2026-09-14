# Local day reset — Plan Brief

> Full plan: `context/changes/local-day-reset/plan.md`
> Prerequisite: `context/changes/first-focus-capture/plan.md`

## What & Why

On a new local calendar day, today's focus is empty, unfinished tasks from yesterday's focus return to backlog, completed tasks stay completed — no user action, no background job (US-03, FR-007).

## Starting Point

S-01 stores `focus_date` on focus assignment. Tasks retain yesterday's `focus_date` in DB — reset is lazy on read.

## Desired End State

User opening app on a new `localDate` sees empty focus panel; yesterday's unfinished focused tasks appear in backlog; yesterday's completed tasks stay completed and invisible in active lists.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Reset mechanism | Lazy read partition by `localDate` | FR-007 — no scheduled job | PRD |
| Reset boundary | Local calendar midnight | Roadmap working decision | Roadmap |
| Focus query | `focus_date = localDate` | Only today's slots in focus panel | Shape-notes |
| Backlog query | Open tasks where `focus_date IS NULL OR focus_date != localDate` | Yesterday focus → backlog automatically | Plan |
| Session across midnight | Re-fetch on focus; lists use fresh localDate | Open Question 1 working decision | PRD |
| DB mutation on reset | None | Data preserved for FR-009 metrics | PRD |

## Scope

**In:** Query/service partition logic, UI refresh with client localDate, manual date-change verification.

**Out:** Persisting historical focus days for analytics UI (S-07 records events separately).

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Query partition | `listTasks(supabase, localDate)` focus/backlog split | Completed with old focus_date must not reappear in backlog |
| 2. UI integration | TaskApp passes current localDate; handles day change | Tab left open overnight |
| 3. Verification | Manual date mock / system date change test | Timezone travel edge cases |

**Prerequisites:** S-01. **Effort:** ~1 session, 3 phases.

## Success Criteria (Summary)

- New local day → empty focus, unfinished yesterday tasks in backlog
- Completed tasks stay completed, not in backlog
- No background cron or midnight mutation
