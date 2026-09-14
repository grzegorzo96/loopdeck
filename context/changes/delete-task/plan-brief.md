# Delete task — Plan Brief

> Full plan: `context/changes/delete-task/plan.md`
> Prerequisite: `context/changes/first-focus-capture/plan.md`

## What & Why

User can delete a task; deleting a focused unfinished task frees its slot exactly as unsetting does (FR-006, FR-006a).

## Starting Point

S-01 provides task list UI and PATCH for focus. No delete path yet.

## Desired End State

Delete control on each task (focus and backlog). Focused delete removes row → slot available for another focus same day.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Delete API | `DELETE /api/tasks/[id]` | Standard REST | Plan |
| Focused delete | Row deleted → slot freed | FR-006a same as unset | PRD |
| Confirm UX | Simple confirm dialog | Prevent mis-tap; no undo in MVP | Plan |
| Completed delete | Allowed — removes from focus view | Hygiene; slot already "used" today | Plan |

## Scope

**In:** DELETE endpoint, delete button + confirm, slot-freed verification.

**Out:** Soft delete, undo, bulk delete.

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Delete API | DELETE handler with auth + ownership | RLS already scopes delete |
| 2. Delete UI | Button + confirm on task rows | Accidental delete |
| 3. Verification | Delete focused task → can focus 4th (if was 3) | — |

**Prerequisites:** S-01. **Effort:** ~0.5 session, 2 phases.

## Success Criteria (Summary)

- Task deleted from backlog and focus lists
- Deleting focused unfinished task frees slot immediately
