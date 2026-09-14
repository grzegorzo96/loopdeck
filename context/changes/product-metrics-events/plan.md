# Product metrics events — Implementation Plan

## Overview

Record events for Primary metrics (activation, D1 return) and Secondary metrics (completions per focus day) — FR-009, FR-010. No third-party analytics.

## Current State Analysis

- S-01–S-04 provide task lifecycle hooks
- `tasks.completed_at` + `focus_date` cover FR-009 data model
- No events table

## Desired End State

- Table `product_events`: `id`, `user_id`, `event_type`, `occurred_at`, `metadata` (jsonb)
- Event types: `account_created`, `first_task_added`, `focus_day_set`, `task_completed`
- Service `recordEvent()` called from signup, task create, focus set, complete
- Dedup: `first_task_added` once per user; `focus_day_set` once per user per `localDate`
- Event failure logged but does not fail user operation

## What We're NOT Doing

- Metrics dashboard UI
- Third-party analytics (PostHog, etc.)
- Real-time pipelines

## Phase 1: Events migration

### Changes Required

#### 1. Migration

**File:** `supabase/migrations/<timestamp>_create_product_events.sql`

**Intent:** Append-only event log with RLS.

**Contract:**

- `product_events` columns as above
- `event_type` text CHECK in allowed set
- Index `(user_id, event_type)`, `(user_id, occurred_at)`
- RLS enabled: INSERT where `auth.uid() = user_id`; SELECT own rows (for future); no UPDATE/DELETE for users
- Unique partial index for dedup optional: `(user_id, event_type) WHERE event_type = 'first_task_added'`; `(user_id, (metadata->>'focus_date')) WHERE event_type = 'focus_day_set'` — or handle dedup in service with INSERT ... ON CONFLICT DO NOTHING

### Success Criteria

#### Automated

- `npx supabase db reset` applies cleanly
- lint, check, build pass

---

## Phase 2: Event service

### Changes Required

#### 1. Event types and service

**Files:** `src/types.ts` (extend), `src/lib/services/product-events.ts` (new)

**Intent:** Typed event recording with dedup helpers.

**Contract:**

- `recordEvent(supabase, { eventType, metadata? })` — insert, swallow/log errors
- `recordFirstTaskAddedIfNew(supabase, userId, taskId)`
- `recordFocusDaySetIfNew(supabase, userId, localDate)`
- `recordTaskCompleted(supabase, userId, taskId, focusDate)`

### Success Criteria

#### Manual

- Duplicate focus_day_set same day → one row

---

## Phase 3: Instrumentation

### Changes Required

#### 1. Hook signup

**File:** `src/pages/api/auth/signup.ts`

**Intent:** `account_created` on successful signUp.

**Contract:** Record after user created; use session client if user id available post-signup.

#### 2. Hook task routes

**Files:** `src/pages/api/tasks/index.ts`, `[id].ts`, `focus/swap.ts`

**Intent:** Record first_task_added, focus_day_set, task_completed at appropriate points.

**Contract:**

- createTask → first_task_added (dedup), focus_day_set if setFocus
- setFocus / swap → focus_day_set
- complete → task_completed with metadata `{ task_id, focus_date }`

### Success Criteria

#### Manual

- SQL: activation = users with first_task_added / account_created
- SQL: D1 proxy = users with focus_day_set on 2 distinct dates

## Example queries (documentation in plan comments or README)

```sql
-- Activation rate
SELECT COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'first_task_added') * 1.0
  / NULLIF(COUNT(DISTINCT user_id) FILTER (WHERE event_type = 'account_created'), 0)
FROM product_events;
```

## References

- PRD FR-009, FR-010

## Progress

### Phase 1: Events migration

#### Automated

- [x] 1.1 Migration applies: `npx supabase db reset`
- [x] 1.2 Lint, check, build pass

### Phase 2: Event service

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 Dedup behavior verified

### Phase 3: Instrumentation

#### Automated

- [x] 3.1 Lint, check, build pass

#### Manual

- [x] 3.2 All four event types fire on happy paths
- [x] 3.3 Sample SQL metrics queries return sensible results
