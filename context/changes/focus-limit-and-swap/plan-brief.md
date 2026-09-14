# Focus limit and swap — Plan Brief

> Full plan: `context/changes/focus-limit-and-swap/plan.md`
> Prerequisite: `context/changes/first-focus-capture/plan.md`

## What & Why

The moment the product sells itself or dies (US-02): when today's focus holds 3 slots, attempting a 4th is refused with a one-sentence rule explanation and an explicit swap — or cancel without changing focus.

## Starting Point

S-01 delivers task API and UI with basic limit enforcement (409). F-01 trigger also blocks 4th focus at DB layer.

## Desired End State

User taps focus on a 4th backlog task → modal explains "three for today is the whole day" → pick which of 3 leaves focus → new task takes slot, or cancel leaves everything unchanged.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Swap API | `POST /api/tasks/focus/swap` atomic | Unset A + set B in one handler avoids trigger race (F-01 note) | F-01 |
| Refusal copy | Fixed sentence naming the rule | US-02 acceptance — not generic error | PRD |
| Completed slots | Shown in swap picker, not swappable-out as "free" | FR-004a — completed still occupy slots | PRD |
| Client hint | Disable focus button at 3 slots | Hint only; server remains authoritative | PRD NFR |
| Cancel behavior | No DB writes on cancel | US-02 acceptance | PRD |

## Scope

**In:** Swap endpoint, refusal modal, focus-limit error mapping from F-01 service.

**Out:** Swap count limits, "focus for tomorrow", completion UX (S-03).

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Swap API | Atomic swap handler | Order: unset source before set target |
| 2. Swap UI | Modal + copy + picker | Completed tasks visible but marked done |
| 3. Verification | Manual 4th-focus + cancel paths | Concurrent swap edge cases |

**Prerequisites:** S-01. **Effort:** ~1 session, 3 phases.

## Success Criteria (Summary)

- 4th focus attempt opens swap flow with rule sentence
- Successful swap replaces one focus task; cancel is no-op
- Completed task in focus still blocks a 4th without swap
