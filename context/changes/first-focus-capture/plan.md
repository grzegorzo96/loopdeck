# First focus capture — Implementation Plan

## Overview

Deliver the north star slice: logged-in user adds a task and sets it as today's focus in one flow, sees newest-first backlog, toggles focus under the limit of 3, and reads the rule on empty state (US-01, FR-002/003/004/008).

## Current State Analysis

- F-01 (planned/in-progress): `tasks` table, RLS, `src/lib/services/tasks.ts`, `src/types.ts`
- `src/pages/dashboard.astro` — placeholder welcome screen
- Auth routes use form POST + redirect; no JSON task API yet
- Middleware protects `/dashboard` only, not `/api/*`

### Key Discoveries

- First JSON API routes in repo — establish `prerender = false`, zod, auth-in-handler pattern
- Client must send `localDate` (YYYY-MM-DD) on every task request per F-01 contract
- 4th-focus swap UX deferred to S-02; S-01 returns 409 with stable error code

## Desired End State

- `GET /api/tasks?localDate=` — returns `{ focus: Task[], backlog: Task[] }` partitioned by date
- `POST /api/tasks` — `{ title, setFocus, localDate }` creates task, optionally sets focus
- `PATCH /api/tasks/[id]` — `{ action: "setFocus" | "unsetFocus", localDate }`
- Dashboard hosts React `TaskApp` with add form, focus panel, backlog, FR-008 empty state
- `zod` added as direct dependency

## What We're NOT Doing

- Swap modal and polished 4th-focus UX (S-02)
- Complete, delete, day-reset enhancements beyond basic query filter (S-03–S-05)
- Metrics (S-07)
- Route rename `/dashboard` → `/app`
- Title editing

## Implementation Approach

Phase 1: API + service layer wrapping Supabase and F-01 helpers. Phase 2: React UI on dashboard. Phase 3: verification. List endpoint uses `focus_date = localDate` for focus and open tasks with `focus_date IS NULL OR focus_date != localDate` for backlog (completed tasks excluded from backlog in S-01 — only open tasks).

## Critical Implementation Details

**Auth in API handlers:** Check `context.locals.user` or `supabase.auth.getUser()`; return 401 JSON if missing. Do not rely on middleware for `/api/tasks`.

**Focus set:** Call `checkFocusLimit` before write; on failure return 409 `{ code: "focus_limit_exceeded" }` for S-02 to hook.

## Phase 1: Task API

### Overview

JSON task endpoints with zod validation and F-01 focus contract.

### Changes Required

#### 1. Dependencies and shared schemas

**File:** `package.json`, `src/lib/schemas/tasks.ts` (new)

**Intent:** Add zod; centralize request validation schemas reused by routes.

**Contract:** Schemas: `localDateSchema` (YYYY-MM-DD), `createTaskSchema`, `patchTaskSchema`, `listTasksQuerySchema`. Title: trimmed, min 1, max 500 chars.

#### 2. Task service

**File:** `src/lib/services/task-queries.ts` (new)

**Intent:** Encapsulate Supabase queries — list partition, insert, update focus_date.

**Contract:**

- `listTasks(supabase, localDate)` → `{ focus, backlog }` — focus: `focus_date = localDate`; backlog: open (`completed_at IS NULL`) AND (`focus_date IS NULL OR focus_date != localDate`); backlog ordered `created_at DESC`
- `createTask(supabase, { title, userId, setFocus, localDate })` — insert with optional `focus_date = localDate`
- `setTaskFocus(supabase, taskId, localDate)` / `unsetTaskFocus(supabase, taskId)` — update `focus_date`

#### 3. API routes

**Files:**

- `src/pages/api/tasks/index.ts` — GET list, POST create
- `src/pages/api/tasks/[id].ts` — PATCH focus/unfocus

**Intent:** HTTP surface for TaskApp and future slices.

**Contract:** Each exports `export const prerender = false`. Auth guard → 401. Zod parse → 400. Success → 200/201 JSON. Focus limit → 409 `{ code: "focus_limit_exceeded", message: "..." }`.

### Success Criteria

#### Automated Verification

- Linting passes: `npm run lint`
- Type checking passes: `npx astro check`
- Build passes: `npm run build`

#### Manual Verification

- curl/fetch with session cookie: create task with setFocus, list returns it in focus
- 4th focus returns 409 (before S-02 UI)

---

## Phase 2: Dashboard UI

### Overview

Replace dashboard placeholder with interactive task board.

### Changes Required

#### 1. TaskApp component

**Files:** `src/components/tasks/TaskApp.tsx`, `TaskAddForm.tsx`, `TaskList.tsx`, `FocusPanel.tsx`, `BacklogPanel.tsx`, `EmptyState.tsx` (new)

**Intent:** React island for all task interactivity per AGENTS.md (hooks in `src/components/hooks/` if needed).

**Contract:**

- `TaskApp` reads `localDate` from `new Date().toLocaleDateString("en-CA")` (YYYY-MM-DD in most locales)
- Empty state (FR-008): one sentence e.g. "Pick three tasks for today — that's the whole day."
- Add form: single input + submit → POST with `setFocus: true`
- Focus panel: up to 3 items, unset button
- Backlog: newest first, "Add to focus" button
- Use shadcn `Button`, `cn()` for classes

#### 2. Dashboard page

**File:** `src/pages/dashboard.astro`

**Intent:** SSR shell loading TaskApp with `client:load`.

**Contract:** Keep sign-out control. Pass no secrets to client.

### Success Criteria

#### Automated Verification

- Lint, astro check, build pass

#### Manual Verification

- Full flow: sign in → empty state → add task → appears in focus
- Unset returns task to backlog; re-focus works
- Third focus works; fourth shows error (generic until S-02)

---

## Phase 3: Verification

### Overview

Ensure auth smoke still passes and task flow works end-to-end.

### Changes Required

#### 1. Smoke compatibility

**File:** `scripts/smoke.mjs` — no change required if dashboard still returns 200 for authed user.

**Intent:** Confirm no regression in auth smoke path.

### Success Criteria

#### Automated Verification

- `npm run smoke` passes against running preview

#### Manual Verification

- Mobile-width layout usable (responsive check)

---

## Testing Strategy

Manual only per AGENTS.md. Key paths: add+focus, unset, backlog order, empty state, 409 at limit.

## References

- F-01: `context/changes/task-schema-rls/plan.md`
- PRD US-01, FR-002, FR-003, FR-003a, FR-004, FR-008

## Progress

> Convention: `- [x]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands.

### Phase 1: Task API

#### Automated

- [x] 1.1 Linting passes: `npm run lint`
- [x] 1.2 Type checking passes: `npx astro check`
- [x] 1.3 Build passes: `npm run build`

#### Manual

- [x] 1.4 Create + list + focus/unfocus work via HTTP with session

### Phase 2: Dashboard UI

#### Automated

- [x] 2.1 Linting passes: `npm run lint`
- [x] 2.2 Type checking passes: `npx astro check`
- [x] 2.3 Build passes: `npm run build`

#### Manual

- [x] 2.4 Add-and-focus one-flow works in browser; empty state visible

### Phase 3: Verification

#### Automated

- [x] 3.1 `npm run smoke` passes

#### Manual

- [x] 3.2 Responsive layout checked on narrow viewport
