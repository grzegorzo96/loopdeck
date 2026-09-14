# Local day reset — Implementation Plan

## Overview

Lazy day reset on read: new local calendar day shows empty focus, unfinished tasks from prior focus days appear in backlog, completed tasks stay completed (US-03, FR-007). Working decision: local midnight boundary.

## Current State Analysis

- S-01 `listTasks` may use basic partition; verify completed-with-old-focus_date handling
- No DB mutation on day change — by design

## Desired End State

- `listTasks(supabase, localDate)` correctly partitions:
  - **Focus:** `focus_date = localDate` (includes done tasks for today)
  - **Backlog:** open tasks where `focus_date IS NULL OR focus_date < localDate` (strictly past dates, not future)
- Yesterday's unfinished focused tasks appear in backlog without UPDATE
- Completed tasks (any date) never in backlog
- UI refreshes `localDate` on visibility change / interval for session-across-midnight

## What We're NOT Doing

- Background cron or scheduled reset
- Clearing `focus_date` column at midnight
- History screen for past focus days
- 4:00 a.m. reset (roadmap working decision: midnight)

## Critical Implementation Details

**Past focus_date in backlog:** Task with `focus_date = yesterday` and `completed_at IS NULL` is backlog — user can re-focus today (subject to limit).

**Future focus_date:** Reject on write (F-01 date guard); exclude from today's focus read.

## Phase 1: Query partition

### Changes Required

#### 1. Update listTasks

**File:** `src/lib/services/task-queries.ts`

**Intent:** Correct lazy-reset semantics.

**Contract:**

- Backlog filter: `completed_at IS NULL AND (focus_date IS NULL OR focus_date < localDate)`
- Focus filter: `focus_date = localDate`
- Do not include `focus_date > localDate`

### Success Criteria

#### Manual

- Seed task with focus_date = yesterday, open → appears in backlog when localDate = today

---

## Phase 2: UI day refresh

### Changes Required

#### 1. TaskApp localDate lifecycle

**File:** `src/components/tasks/TaskApp.tsx`

**Intent:** Handle session open across midnight.

**Contract:** Recompute `localDate` on `document.visibilitychange` (visible) and refetch tasks. Optional: compare stored date in state vs current; if changed, refetch without full reload.

### Success Criteria

#### Manual

- Change system date or mock localDate → focus empty, yesterday tasks in backlog

---

## Phase 3: Verification

#### Manual

- Completed yesterday task: not in backlog, not in today focus
- Unfinished yesterday task: in backlog, can focus today

## References

- PRD US-03, FR-007, roadmap Open Question 1

## Progress

### Phase 1: Query partition

#### Automated

- [x] 1.1 Lint, check, build pass

#### Manual

- [x] 1.2 Yesterday open focus → today backlog verified

### Phase 2: UI day refresh

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 Visibility refetch on date change verified

### Phase 3: Verification

#### Manual

- [x] 3.1 Completed vs unfinished yesterday behavior correct
