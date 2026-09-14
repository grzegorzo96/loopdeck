# Delete task — Implementation Plan

## Overview

User deletes a task; deleting a focused unfinished task frees its slot like unsetting (FR-006, FR-006a).

## Current State Analysis

- S-01: task list UI, no delete
- F-01: DELETE RLS policy exists

## Desired End State

- `DELETE /api/tasks/[id]` — auth + ownership via RLS, returns 204
- Delete button on task rows with confirm dialog
- After deleting focused task, user can focus another (if was at limit)

## What We're NOT Doing

- Soft delete, undo, bulk delete
- Archive completed tasks separately

## Phase 1: Delete API

### Changes Required

#### 1. DELETE handler

**File:** `src/pages/api/tasks/[id].ts`

**Intent:** Remove task row; CASCADE not needed beyond single row.

**Contract:** `prerender = false`, auth guard, DELETE method. 404 if not found/not owned. 204 on success.

### Success Criteria

#### Automated

- lint, check, build pass

#### Manual

- DELETE focused task via HTTP; focus count drops

---

## Phase 2: Delete UI

### Changes Required

#### 1. Task row delete control

**Files:** `src/components/tasks/TaskList.tsx` or row component

**Intent:** Delete affordance with confirmation.

**Contract:** Confirm dialog ("Delete this task?"). On success, refetch lists.

### Success Criteria

#### Manual

- Delete from backlog and focus works
- Delete focused task → can add new focus to fill slot

## Progress

### Phase 1: Delete API

#### Automated

- [x] 1.1 Lint, check, build pass

#### Manual

- [x] 1.2 DELETE removes task; slot freed when focused

### Phase 2: Delete UI

#### Automated

- [x] 2.1 Lint, check, build pass

#### Manual

- [x] 2.2 Delete + confirm flow in browser
