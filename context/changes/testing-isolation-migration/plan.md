# Isolation + migration safety tests — Implementation Plan

## Overview

Add integration tests proving User A cannot read or modify User B's tasks (test-plan Risk #2) and that the tasks schema is present with RLS enabled (Risk #3). Uses two authenticated Supabase clients via existing `tests/helpers/supabase.ts` — same layer as Phase 1 focus-limit tests.

## Desired End State

- `npm run test:integration` includes isolation + schema tests; passes with local Supabase.
- Risk #2: cross-user read/write/delete paths return `not_found` or empty lists; spoofed `user_id` insert denied by RLS.
- Risk #3: schema sanity check confirms `tasks` table and RLS policies exist.
- `context/foundation/test-plan.md` Phase 2 row updated to `implemented`.

## What We're NOT Doing

- HTTP/API route handler tests (service layer + RLS is the contract).
- E2E two-browser-user flows (integration is cheaper signal).
- CI wiring for integration (test-plan Phase 4).
- Full `supabase db reset` migration replay in CI.

## Phase 1: Cross-user isolation integration tests

### Changes Required

**File**: `tests/integration/task-isolation.test.ts` (new)

**Contract**: Fresh User A and User B in `beforeAll`. User A creates a focus task. User B attempts list (absent), setFocus, complete, unsetFocus, delete → all deny with `not_found` or empty. User B direct insert with `user_id: userA.userId` fails RLS.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes with Supabase env exported
- `npm run lint` passes

---

## Phase 2: Migration schema sanity

### Changes Required

**File**: `tests/integration/migration-schema.test.ts` (new)

**Contract**: Query `tasks` via service-role client; assert table readable. Query `pg_policies` or attempt anon read without auth to confirm RLS blocks unauthenticated access.

### Success Criteria

#### Automated Verification

- `npm run test:integration` passes

---

## Progress

### Phase 1: Cross-user isolation integration tests

#### Automated

- [x] 1.1 Add `tests/integration/task-isolation.test.ts` covering list + write + delete denial
- [x] 1.2 Verify `npm run test:integration` green

#### Manual

- [ ] 1.3 Confirm tests fail if RLS policies are disabled (spot-check optional)

### Phase 2: Migration schema sanity

#### Automated

- [x] 2.1 Add `tests/integration/migration-schema.test.ts`
- [x] 2.2 Verify full integration suite green

#### Manual

- [ ] 2.3 Update test-plan Phase 2 status and cookbook §6.2
