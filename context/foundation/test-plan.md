# Test Plan

> Phased test rollout for this project. Strategy is frozen at the top
> (§1–§5); cookbook patterns at the bottom (§6) fill in as phases ship.
> Read before writing any new test.
>
> Refresh: re-run `/10x-test-plan --refresh` when stale (see §8).
>
> Last updated: 2026-09-14

## 1. Strategy

Tests follow three non-negotiable principles for this project:

1. **Cost × signal.** The cheapest test that gives a real signal for the
  risk wins. Do not promote to e2e because e2e "feels safer." Do not put a
   vision model on top of a deterministic visual diff that already catches
   the regression.
2. **User concerns are first-class evidence.** Risks anchored in "the
  team is worried about X, and the failure would surface somewhere in
   focus-limit or data-isolation logic" carry the same weight as PRD lines
   or hot-spot data.
3. **Risks are scenarios, not code locations.** This plan documents *what
  could fail* and *why we believe it's likely* — drawn from documents,
   interview, and codebase *signal* (churn, structure, test base). It does
   NOT claim to know which line owns the failure. That knowledge is
   produced by `/10x-research` during each rollout phase. If the plan and
   research disagree about where the failure lives, research is the
   ground truth.

Hot-spot scope used for likelihood weighting: `src/`, `supabase/migrations/`
(insufficient git history — 4 commits/30d; likelihood from PRD, roadmap,
and interview only).

## 2. Risk Map

The top failure scenarios this project must protect against, ordered by
risk = impact × likelihood. Risks are failure scenarios in user / business
terms, not test names. The Source column cites the *evidence that surfaced
this risk* — never a specific file as "where the failure lives" (that is
research's job, see §1 principle #3).


| #   | Risk (failure scenario)                                                                           | Impact | Likelihood | Source (evidence — not anchor)                                         |
| --- | ------------------------------------------------------------------------------------------------- | ------ | ---------- | ---------------------------------------------------------------------- |
| 1   | A user sets a 4th task in today's focus and the app accepts it without refusal or swap            | High   | High       | interview Q1; PRD US-02, FR-004, NFR (server-side limit); roadmap S-02 |
| 2   | User A reads or modifies User B's tasks                                                           | High   | Medium     | PRD guardrails (isolation NFR); roadmap F-01; abuse lens (IDOR)        |
| 3   | A Supabase migration passes locally/staging but corrupts or locks prod task rows                  | High   | Medium     | interview Q2; roadmap F-01 (schema + RLS foundation)                   |
| 4   | On a new local calendar day, unfinished focus tasks vanish or completed tasks reappear in backlog | High   | Medium     | PRD US-03, FR-007; roadmap S-04                                        |
| 5   | Completing a focus task frees its slot, allowing a 4th focus the same day                         | High   | Medium     | PRD FR-004a, US-02; interview Q3 (focus-limit roulette)                |
| 6   | A backlog task is marked done without entering focus first                                        | Medium | Medium     | PRD FR-005b, US-04; roadmap S-03                                       |
| 7   | A client-supplied local date places focus on the wrong day or bypasses day reset                  | Medium | Medium     | PRD FR-007; abuse lens (untrusted input parity)                        |




### Risk Response Guidance


| Risk | What would prove protection                                                          | Must challenge                          | Context `/10x-research` must ground                              | Likely cheapest layer                          | Anti-pattern to avoid                                           |
| ---- | ------------------------------------------------------------------------------------ | --------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| #1   | 4th focus attempt returns refusal with rule copy; swap path works; state stays at ≤3 | "UI disable is enough"                  | Focus-set entry points, server enforcement layer, error shape    | Integration against real DB contract           | Asserting UI disabled state only; mirroring count logic in test |
| #2   | User B's task IDs return 404/403 for User A on read/write/delete                     | "Middleware auth implies row ownership" | RLS policies, API error translation, test fixtures for two users | Integration with two authenticated clients     | Single-user happy path; mocking away the DB                     |
| #3   | Migration applies cleanly on fresh DB + sample data; destructive ops are explicit    | "Ran once locally = safe"               | Migration ordering, constraints, rollback story                  | SQL migration test or supabase db reset + seed | Manual-only migration checks                                    |
| #4   | After date boundary, focus empty, unfinished → backlog, completed unchanged          | "Empty response means reset worked"     | Local-date input on read/write, lazy reset trigger               | Intchegration with controlled date fixture     | Hard-coded "today" in test matching prod code                   |
| #5   | After completion, slot count still 3; 4th focus still blocked                        | "Complete frees capacity"               | Completion + focus-set interaction order                         | Integration sequence test                      | Testing completion UI without asserting slot count              |
| #6   | Complete-from-backlog rejected with explanatory error                                | "Any open task can be completed"        | Completion endpoint guards vs focus membership                   | Integration                                    | Only testing focus completion path                              |
| #7   | Server derives or validates focus day; client cannot set arbitrary past/future focus | "Trust client local date header"        | Date header/param contract, server clock vs client               | Integration with boundary dates                | Copying date helper from prod into expected value               |




## 3. Phased Rollout

Each row is a discrete rollout phase that will open its own change folder
via `/10x-new`. Status moves left-to-right through the values below; the
orchestrator updates Status as artifacts appear on disk.


| #   | Phase name                   | Goal (one line)                                                       | Risks covered | Test types              | Status        | Change folder                                      |
| --- | ---------------------------- | --------------------------------------------------------------------- | ------------- | ----------------------- | ------------- | -------------------------------------------------- |
| 1   | Critical-path: focus limit   | Bootstrap Vitest and prove the 3-task focus cap at the cheapest layer | #1, #5, #6    | unit + integration      | implemented   | context/changes/testing-critical-path-focus-limit/ |
| 2   | Isolation + migration safety | Prove cross-account denial and migration apply on fresh DB            | #2, #3        | integration + migration | implemented   | context/changes/testing-isolation-migration/       |
| 3   | Day lifecycle                | Prove lazy reset and date-boundary behavior                           | #4, #7        | integration             | implemented   | context/changes/testing-day-lifecycle/             |
| 4   | Quality-gates wiring         | Wire unit/integration into CI alongside lint/build/smoke              | cross-cutting | CI gates                | implemented   | —                                                  |




## 4. Stack

The classic test base for this project. AI-native tools (if any) carry a
`checked:` date so future readers can see which lines need re-verification.
Recommendations in this section must be grounded in local manifests/configs
plus the MCP/tools actually exposed in the current session. If a useful docs
or search MCP such as Context7 or Exa.ai is not available, say that instead
of assuming access.


| Layer                | Tool                                         | Version | Notes                                                                              |
| -------------------- | -------------------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| unit + integration   | Vitest                                       | 5.0.0   | `npm run test:unit`, `npm run test:integration`; integration needs local Supabase  |
| API mocking          | none yet                                     | —       | prefer real Supabase local; mock only at network edge if needed                    |
| e2e                  | Playwright                                   | 1.63.0  | `npm run test:e2e`; auth via `tests/e2e/auth.setup.ts`; CI job in workflow        |
| accessibility        | none yet                                     | —       | not in MVP rollout scope                                                           |
| (optional) AI-native | cursor-ide-browser MCP — checked: 2026-09-14 | n/a     | use only when integration cannot catch a user-visible regression                   |


**Stack grounding tools (current session):**

- Docs: none — no Context7 or framework docs MCP in session; skipped; checked: 2026-09-14
- Search: web search MCP — available for Vitest/Astro setup verification when Phase 1 plans; checked: 2026-09-14
- Runtime/browser: cursor-ide-browser — available for optional e2e verification; not primary for focus-limit risks; checked: 2026-09-14
- Provider/platform: user-10x-mvp-tracker — certification tracking only; not a test gate; checked: 2026-09-14



## 5. Quality Gates

The full set of gates that must pass before a change reaches production.
"Required for §3 Phase N" means the gate is enforced once that rollout
phase lands; before that, the gate is `planned`.


| Gate                        | Where                | Required?                 | Catches                                         |
| --------------------------- | -------------------- | ------------------------- | ----------------------------------------------- |
| lint + typecheck            | local + CI           | required                  | syntactic / type drift                          |
| auth smoke                  | CI on PR             | required                  | broken auth flow against local Supabase preview |
| unit + integration          | local + CI           | required                  | focus-limit, isolation, day-lifecycle regressions |
| e2e on critical flows       | CI on PR             | required                  | broken critical user paths beyond integration   |
| post-edit hook              | local (agent loop)   | not planned               | —                                               |
| visual diff (deterministic) | CI on PR             | not planned               | —                                               |
| pre-prod smoke              | between merge + prod | optional                  | environment-specific failures                   |




## 6. Cookbook Patterns

How to add new tests in this project. Each sub-section is filled in once
the relevant rollout phase ships; before that, the sub-section reads
"TBD — see §3 Phase N."

### 6.1 Adding a unit test

Place under `tests/unit/**/*.test.ts`. No Supabase required — run with `npm run test:unit`.

Cover pure functions (`validateFocusDate`, `isFocusLimitDbError`, `taskErrorResponse`) with `vi.useFakeTimers()` for date windows. See `tests/unit/services/tasks.test.ts` and `tests/unit/api/task-errors.test.ts`.

### 6.2 Adding an integration test

Place under `tests/integration/*.test.ts`. Requires local Supabase + env export (see `vitest.config.ts` header).

**Focus-limit pattern (Phase 1):** call `task-queries.ts` with `createTestUser()` client; assert via operations + `listTasks` length — do not mirror count logic.

**Isolation pattern (Phase 2):** create User A + User B in `beforeAll`; User A owns a task; User B attempts read/write/delete → expect `not_found` or empty lists; spoofed `user_id` insert must fail RLS. See `tests/integration/task-isolation.test.ts`.

**Schema sanity (Phase 2):** service-role column probe + unauthenticated read returns empty. See `tests/integration/migration-schema.test.ts`.

### 6.3 Adding an e2e test

Place under `tests/e2e/*.spec.ts`. Requires running server (`npm run dev` or preview). Auth via setup project in `playwright.config.ts` — never sign in through UI in individual specs.

Model on `tests/e2e/seed.spec.ts`; name after a risk in §2. Run with `npm run test:e2e`.

### 6.4 Adding a test for a new API endpoint

Prefer service-layer integration in `tests/integration/` calling `task-queries.ts` with `createTestUser()` — avoids Astro `APIContext` wiring. Assert via operations + `listTasks`, not mirrored business logic.

### 6.5 Adding a migration test

Schema sanity via service-role column probe + RLS probe. See `tests/integration/migration-schema.test.ts`.

### 6.6 Per-rollout-phase notes

- **Phase 1:** `tests/integration/focus-limit.test.ts` — risks #1, #5, #6; `beforeEach` → `deleteAllUserTasks`.
- **Phase 2:** `tests/integration/task-isolation.test.ts`, `migration-schema.test.ts`.
- **Phase 3:** `tests/integration/day-lifecycle.test.ts` — lazy reset (#4) + date window (#7); use `offsetLocalDate()` helper.
- **Phase 4:** `ci` job runs `test:unit`; `integration` job runs `test:integration` against local Supabase; `e2e` job runs Playwright.

## 7. What We Deliberately Don't Test

Exclusions agreed during the rollout (Phase 2 interview, Q5). Future
contributors should respect these unless the underlying assumption changes.

- **Internal admin tools** — five trusted users, low blast radius. Re-evaluate if admin surface ships or user count grows. (Source: Phase 2 interview Q5.)



## 8. Freshness Ledger

- Strategy (§1–§5) last reviewed: 2026-09-14
- Stack versions last verified: 2026-09-14
- AI-native tool references last verified: 2026-09-14

Refresh (`/10x-test-plan --refresh`) when:

- a new top-3 risk surfaces from the roadmap or archive,
- a recommended tool's `checked:` date is older than three months,
- the project's tech stack changes (new framework, new test runner),
- §7 negative-space no longer matches what the team believes.

