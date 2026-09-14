# Product metrics events — Plan Brief

> Full plan: `context/changes/product-metrics-events/plan.md`
> Prerequisites: S-01, S-03, S-04

## What & Why

Record the minimum event set to compute Primary metrics (activation, D1 return) and Secondary metrics (completions per focus day) — FR-009, FR-010. No third-party analytics.

## Starting Point

Task lifecycle exists across S-01–S-04. Completions store `completed_at` + `focus_date` (FR-009). No dedicated events table or instrumentation.

## Desired End State

Append-only `product_events` table records: `account_created`, `first_task_added`, `focus_day_set`, `task_completed` — each with user_id, timestamp, and metadata (focus_date, task_id). Enough to SQL-query activation ≥60% and D1 return ≥30% hypotheses.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Storage | `product_events` table + RLS | Product's own data suffices per FR-010 | PRD |
| Event types | 4 types listed above | Covers Primary + Secondary funnel | PRD |
| focus_day_set | Once per user per local focus_date | D1 return = distinct focus days | Plan |
| first_task_added | Once per user ever | Activation numerator | PRD |
| task_completed | Each completion with focus_date in metadata | Secondary metric | FR-009 |
| account_created | On signup success | Activation denominator | FR-010 |
| Analytics UI | None in MVP | PRD Non-Goals — query via SQL/Studio | PRD |

## Scope

**In:** Migration, event service, hooks in auth signup + task API routes.

**Out:** Dashboard for metrics, third-party analytics, admin queries UI.

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Events migration | Table + RLS (insert own, no cross-user read needed for MVP) | Idempotency for focus_day_set |
| 2. Event service | `recordEvent()` with dedup helpers | Must not block main flow on event failure |
| 3. Instrumentation | Hooks in signup, create, focus, complete | S-04 day boundary for focus_day_set |

**Prerequisites:** S-01, S-03, S-04. **Effort:** ~1 session, 3 phases.

## Success Criteria (Summary)

- Events recorded for all four types
- SQL query can compute activation rate and D1 return proxy
- Event write failure does not fail user-facing operation
