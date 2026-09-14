# Complete in focus — Implementation Plan

## Overview

Mark today's-focus tasks done; stay visible as done; slot remains taken; show "N of 3 done" (US-04, FR-005/005a/005b).

## Current State Analysis

- S-01: focus/backlog UI, PATCH for focus only
- `completed_at` column unused

## Desired End State

- `PATCH /api/tasks/[id]` accepts `action: "complete"` with `localDate`
- Sets `completed_at = now()` only when `focus_date = localDate` and task open
- Backlog complete → 422 with focus-first message
- UI: complete button on focus tasks, strikethrough/done styling, "N of M done" header

## What We're NOT Doing

- Uncomplete / reopen
- Complete from backlog (refused, not silently moved)
- Metrics hook (S-07)

## Phase 1: Complete API

### Changes Required

#### 1. Extend PATCH handler

**File:** `src/pages/api/tasks/[id].ts`

**Intent:** Add complete action with FR-005b guard.

**Contract:** `action: "complete"` + `localDate`. Reject if `focus_date != localDate` or null → 422 `{ code: "complete_requires_focus", message: "..." }`. Idempotent if already completed. Do not clear `focus_date`.

### Success Criteria

#### Automated

- lint, check, build pass

#### Manual

- Complete focus task succeeds; backlog task returns 422

---

## Phase 2: Complete UI

### Changes Required

#### 1. FocusPanel updates

**Files:** `src/components/tasks/FocusPanel.tsx`, `TaskApp.tsx`

**Intent:** Complete affordance and readout.

**Contract:** Complete button on open focus tasks only. Done tasks: visual done state, no complete button. Header: `{doneCount} of {focus.length} done` where doneCount = focus tasks with `completed_at`.

### Success Criteria

#### Manual

- Complete in UI; readout updates; slot still counts toward limit of 3

---

## Phase 3: Verification

#### Manual

- 3 done → still cannot add 4th without swap (S-02)
- Backlog item shows no complete button (or disabled with tooltip)

## References

- PRD US-04, FR-005b

## Progress

### Phase 1: Complete API

#### Automated

- [x] 1.1 Lint, check, build pass

#### Manual

- [x] 1.2 Complete + backlog refusal via HTTP

### Phase 2: Complete UI

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 N-of-3 readout and done styling in browser

### Phase 3: Verification

#### Manual

- [x] 3.1 Three completions still block 4th focus
