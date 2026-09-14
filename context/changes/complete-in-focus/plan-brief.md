# Complete in focus — Plan Brief

> Full plan: `context/changes/complete-in-focus/plan.md`
> Prerequisite: `context/changes/first-focus-capture/plan.md`

## What & Why

User marks a today's-focus task done; it stays visible as done, slot remains taken, and "N of 3 done" is visible (US-04, FR-005/005a/005b).

## Starting Point

S-01 provides focus list and task API. `completed_at` column exists from F-01 but unused.

## Desired End State

Complete button on focus tasks only. Done tasks show strikethrough/check in focus panel. Readout: "2 of 3 done". Backlog complete attempt shows refusal in US-02 voice.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Complete API | `PATCH /api/tasks/[id]` with `action: "complete"` | Reuses task route pattern | Plan |
| Backlog refusal | 422 + one sentence explaining focus-first rule | FR-005b; matches US-02 voice | PRD |
| Slot after complete | No focus_date change | FR-004a — slot held until day reset | PRD |
| Readout | Count focus tasks where completed_at IS NOT NULL for today | US-04 acceptance | PRD |
| Re-open done | Out of scope | MVP: no uncomplete | PRD Non-Goals |

## Scope

**In:** Complete endpoint, UI button + done styling, N-of-3 readout, backlog refusal message.

**Out:** Metrics recording (S-07), history screen.

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Complete API | PATCH complete + backlog guard | Must verify focus_date = localDate |
| 2. Focus UI | Complete button, done state, readout | Don't allow complete on backlog |
| 3. Verification | Manual complete + slot-still-taken check | 4th focus still blocked after 3 done |

**Prerequisites:** S-01. **Effort:** ~1 session, 3 phases.

## Success Criteria (Summary)

- Focus task completes in place; slot count unchanged
- "N of 3 done" updates correctly
- Backlog task cannot be completed without focusing first
