# Focus limit and swap — Implementation Plan

## Overview

When today's focus holds 3 slots, attempting a 4th is refused with a one-sentence rule explanation and an explicit swap — or cancel without changing focus (US-02, FR-004/004a/004b).

## Current State Analysis

- S-01: task API returns 409 `focus_limit_exceeded` on 4th focus
- F-01: DB trigger also blocks 4th focus
- No swap endpoint or modal yet

## Desired End State

- `POST /api/tasks/focus/swap` — `{ taskId, swapOutId, localDate }` atomically unsets `swapOutId` then sets `taskId` focus
- UI: focusing 4th task opens modal — rule copy, picker of current 3, confirm/cancel
- Cancel: zero DB writes

## What We're NOT Doing

- Swap rate limits (roadmap: no MVP cap)
- Focus for tomorrow
- Changing completed-slot semantics

## Implementation Approach

Server performs unset then set in single handler (sequential awaits — unset completes before set). UI intercepts 409 from PATCH/POST and opens swap flow instead of toast-only error.

## Critical Implementation Details

**Swap picker:** Show all 3 focus tasks including completed (FR-004a). User must pick one to remove from focus — completed tasks are valid swap-out targets.

**Copy (US-02):** Refusal must name the rule — e.g. "Three for today is the whole day. Swap one out to add this."

## Phase 1: Swap API

### Changes Required

#### 1. Swap endpoint

**File:** `src/pages/api/tasks/focus/swap.ts` (new)

**Intent:** Atomic swap avoiding F-01 trigger race.

**Contract:** `prerender = false`, zod body, auth guard. Steps: validate both tasks belong to user; verify `taskId` not in focus; verify `swapOutId` in today's focus (`focus_date = localDate`); UPDATE swapOut `focus_date = NULL`; UPDATE taskId `focus_date = localDate`. Return updated lists or 409 if logic fails.

### Success Criteria

#### Automated Verification

- lint, astro check, build pass

#### Manual Verification

- Swap succeeds with 3 in focus; after swap still exactly 3 focused

---

## Phase 2: Swap UI

### Changes Required

#### 1. SwapModal component

**File:** `src/components/tasks/SwapModal.tsx` (new)

**Intent:** US-02 interaction — rule sentence, radio/list of 3 focus tasks, Confirm/Cancel.

**Contract:** On 409 from focus attempt, open modal with pending task. Confirm → POST swap. Cancel → close, no requests.

#### 2. TaskApp integration

**File:** `src/components/tasks/TaskApp.tsx`

**Intent:** Wire focus buttons to swap flow when at limit.

**Contract:** Client hint: disable "Add to focus" optional — still allow click to show modal (server authoritative).

### Success Criteria

#### Manual Verification

- 4th focus opens modal with rule text
- Cancel leaves focus unchanged
- Swap replaces chosen task; new task in focus

---

## Phase 3: Verification

### Success Criteria

#### Manual Verification

- [ ] 3 completed focus tasks still block 4th without swap
- [ ] Concurrent swap attempts handled gracefully

## References

- PRD US-02, F-01 swap sequencing note

## Progress

### Phase 1: Swap API

#### Automated

- [x] 1.1 Linting passes: `npm run lint`
- [x] 1.2 Type checking passes: `npx astro check`
- [x] 1.3 Build passes: `npm run build`

#### Manual

- [x] 1.4 Swap API works via HTTP

### Phase 2: Swap UI

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 Modal flow: refuse, swap, cancel verified in browser

### Phase 3: Verification

#### Manual

- [x] 3.1 Completed-in-focus slot blocking verified
