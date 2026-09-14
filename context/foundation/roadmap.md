---
project: Loopdeck
version: 1
status: draft
created: 2026-09-14
updated: 2026-09-14
prd_version: 1
main_goal: market-feedback
top_blocker: decisions
milestone_id: three-for-today-mvp
milestone_seq: 1
milestone_status: done
---

# Roadmap: Loopdeck

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Milestone

**M-1: Three-for-today MVP** — Status: done

- **Intent:** Deliver the full Loopdeck MVP — capture, today's focus with a hard limit of 3, completion, and day reset — so activation and D1 return hypotheses can be measured against real sign-ups.
- **Source materials:** `context/foundation/prd.md` (v1)
- **Done when:** every F-NN and S-NN below is `done`.
- **Scope anchors:** FR-001–FR-010, US-01–US-04

## Vision recap

Knowledge workers drown in open tasks and cannot decide what to do first. Loopdeck's answer is not another list — it is a hard limit of 3 tasks for today. Ordinary lists reward accumulating; this product forces a small daily set and makes the day end. The limit is always per person; scaling adds accounts, not shared focus.

## North star

**S-01: First focus capture** — A logged-in user adds a task and sets it as today's focus in one flow, with the rule visible before they start.

> **North star** here means the smallest end-to-end slice whose successful delivery would prove the core product hypothesis — placed as early as prerequisites allow because everything else only matters if this works.

This slice directly serves the Primary activation metric (≥ 60% set focus in first session). Server-side limit enforcement and swap UX follow in S-02; without capture-to-focus working first, there is nothing to measure.

## At a glance

| ID | Change ID | Outcome (user can …) | Prerequisites | PRD refs | Status |
| ----- | ---------------------- | --------------------------------- | ---------------- | -------------- | -------- |
| F-01 | task-schema-rls | (foundation) task table with focus_date, RLS, and server-side focus-count contract landed | — | NFR (isolation), FR-004 | done |
| S-01 | first-focus-capture | add a task and set it as today's focus in one flow; see the rule on empty state | F-01 | US-01, FR-001, FR-001a, FR-001c, FR-002, FR-003, FR-003a, FR-004, FR-008 | done |
| S-02 | focus-limit-and-swap | be refused on a 4th focus with a one-sentence reason and an explicit swap | S-01 | US-02, FR-004, FR-004a, FR-004b | done |
| S-03 | complete-in-focus | mark a focus task done; slot stays taken; see "N of 3 done" | S-01 | US-04, FR-005, FR-005a, FR-005b | done |
| S-04 | local-day-reset | open on a new local day with empty focus and unfinished tasks back in backlog | S-01 | US-03, FR-007 | done |
| S-05 | delete-task | delete a task; deleting a focused task frees its slot | S-01 | FR-006, FR-006a | done |
| S-06 | account-deletion-privacy | delete their account and all tasks; read privacy policy before sign-up | — | FR-001b, NFR (privacy) | done |
| S-07 | product-metrics-events | (system) record completions, focus days, and activation events for Primary metrics | S-01, S-03, S-04 | FR-009, FR-010 | done |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme | Chain | Note |
| ------ | ------------------ | ------------------------------ | --------------------------------------------------------- |
| A | Core focus loop | `F-01` → `S-01` → `S-02` | Sequenced for market-feedback: capture first, then prove the hard limit. |
| B | Day lifecycle | `S-04` | Joins Stream A after `S-01`; day reset is independent of limit UX polish. |
| C | Task completion | `S-03` | Parallel with Stream A tail after `S-01`; proves slot-held-until-reset reading. |
| D | Account hygiene | `S-06` | Standalone; auth baseline present — GDPR path can run alongside F-01. |
| E | Metrics | `S-07` | Joins after completion and day-reset slices supply event sources. |

## Baseline

What's already in place in the codebase as of `2026-09-14` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** present — Astro 7 + React 19 islands, Tailwind 4, shadcn/ui (`package.json`, `astro.config.mjs`, `src/components/ui/`)
- **Backend / API:** partial — Astro SSR API routes for auth only (`src/pages/api/auth/`); no task endpoints
- **Data:** partial — Supabase client wired for auth (`src/lib/supabase.ts`); no migrations, no task schema
- **Auth:** present — Supabase SSR cookies, middleware gate on `/dashboard` (`src/middleware.ts`, `src/lib/supabase.ts`)
- **Deploy / infra:** partial — Cloudflare Workers config (`wrangler.jsonc`); CI lint/build/smoke only (`.github/workflows/ci.yml`); no auto-deploy
- **Observability:** partial — platform observability flag in `wrangler.jsonc`; no app-level logging, error tracking, or metrics (FR-010 not implemented)

## Foundations

### F-01: Task schema and RLS

- **Outcome:** (foundation) task table with `focus_date`, `completed_at`, per-user RLS, and a server-side focus-count check contract landed.
- **Change ID:** task-schema-rls
- **PRD refs:** NFR (account isolation), FR-004 (limit enforcement prerequisite)
- **Unlocks:** S-01, S-02, S-03, S-04, S-05, S-07
- **Prerequisites:** —
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced first because every vertical slice reads/writes tasks; without RLS the isolation NFR is unenforceable.
- **Status:** done

## Slices

### S-01: First focus capture

- **Outcome:** user can add a task with a title, see a newest-first backlog, set/unset focus (under the limit of 3), and read the rule on empty state — all in one add-and-focus flow.
- **Change ID:** first-focus-capture
- **PRD refs:** US-01, FR-001, FR-001a, FR-001c, FR-002, FR-003, FR-003a, FR-004, FR-008
- **Prerequisites:** F-01
- **Parallel with:** S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** North star for activation measurement; auth FRs satisfied by baseline — this slice must not re-scaffold sign-in but must wire task UI end-to-end.
- **Status:** done

### S-02: Focus limit and swap

- **Outcome:** user can attempt a 4th focus, be refused with a one-sentence rule explanation, and complete an explicit swap — or cancel without changing focus.
- **Change ID:** focus-limit-and-swap
- **PRD refs:** US-02, FR-004, FR-004a, FR-004b
- **Prerequisites:** S-01
- **Parallel with:** S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** PRD calls this the moment the product sells itself or dies; server-side enforcement is non-negotiable — client validation is hint only.
- **Status:** done

### S-03: Complete in focus

- **Outcome:** user can mark a today's-focus task done; it stays visible as done, its slot remains taken, and a "N of 3 done" readout is visible.
- **Change ID:** complete-in-focus
- **PRD refs:** US-04, FR-005, FR-005a, FR-005b
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-04, S-05
- **Blockers:** —
- **Unknowns:**
  - Backlog completion refusal copy — Owner: user. Block: no.
- **Risk:** FR-005b (completion only from focus) is the least popular rule; refusal wording must match US-02 voice.
- **Status:** done

### S-04: Local day reset

- **Outcome:** user can open the product on a new local calendar day with empty focus, unfinished tasks back in backlog, and completed tasks still completed.
- **Change ID:** local-day-reset
- **PRD refs:** US-03, FR-007
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-05
- **Blockers:** —
- **Unknowns:**
  - Midnight vs 4:00 a.m. reset and session-open-across-midnight behaviour — Owner: user. Block: no (working decision: local midnight).
- **Risk:** Lazy reset on read is correct by PRD but must handle client-supplied local date consistently on every read/write.
- **Status:** done

### S-05: Delete task

- **Outcome:** user can delete a task; deleting a focused unfinished task frees its slot the same as unsetting.
- **Change ID:** delete-task
- **PRD refs:** FR-006, FR-006a
- **Prerequisites:** S-01
- **Parallel with:** S-02, S-03, S-04
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Sequenced after core focus loop; delete-as-slot-free is intentional per FR-006a and consistent with FR-004b.
- **Status:** done

### S-06: Account deletion and privacy

- **Outcome:** user can delete their account and all tasks; unauthenticated visitors can read a privacy policy before sign-up.
- **Change ID:** account-deletion-privacy
- **PRD refs:** FR-001b, NFR (privacy policy)
- **Prerequisites:** —
- **Parallel with:** F-01, S-01
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Open registration chosen — FR-001c signup-abuse resistance (via auth provider) and privacy policy before sign-up are launch requirements, not optional polish.
- **Status:** done

### S-07: Product metrics events

- **Outcome:** (system) records account creation, first task added, each focus day set, and each completion with its focus day — enough to compute Primary and Secondary metrics.
- **Change ID:** product-metrics-events
- **PRD refs:** FR-009, FR-010
- **Prerequisites:** S-01, S-03, S-04
- **Parallel with:** S-05
- **Blockers:** —
- **Unknowns:** —
- **Risk:** Deferred until event sources exist; without this slice activation and D1 return hypotheses stay unmeasurable.
- **Status:** done

## Backlog Handoff

| Roadmap ID | Change ID | Suggested issue title | Ready for `/10x-plan` | Notes |
| ---------- | ---------------------- | ----------------------------- | --------------------- | ----- |
| F-01 | task-schema-rls | Land task schema with RLS and focus-count contract | yes | Unblocks north star S-01 |
| S-01 | first-focus-capture | Add task and set today's focus in one flow | no | After F-01 |
| S-02 | focus-limit-and-swap | Refuse 4th focus with explicit swap | no | After S-01 |
| S-03 | complete-in-focus | Mark focus task done; slot stays taken | no | After S-01; parallel with S-02 |
| S-04 | local-day-reset | Reset focus on new local calendar day | no | After S-01 |
| S-05 | delete-task | Delete task; focused delete frees slot | no | After S-01 |
| S-06 | account-deletion-privacy | Account deletion + privacy policy page | yes | Open registration; auth baseline present |
| S-07 | product-metrics-events | Record activation and D1 metric events | no | After S-01, S-03, S-04 |

## Open Roadmap Questions

1. **Does the day reset at local midnight or at 4:00 a.m.?** — Owner: user. Block: S-04 (planning unblocked — working decision: local midnight).
2. **Should setting a focus "for tomorrow" be allowed?** — Owner: user. Block: roadmap-wide (working decision: no).
3. **How many swaps per day is too many?** — Owner: user. Block: — (no MVP limit per FR-004b).
## Resolved

- **Open registration or invite-only?** — Resolved 2026-09-14: **open registration**. Faster signal for market-feedback goal; FR-001c abuse resistance stays mandatory via auth provider.

## Parked

- **Shared lists, teams, roles** — Why parked: PRD §Non-Goals; flat single-user model locked for MVP.
- **Projects, tags, subtasks, priorities** — Why parked: taxonomy competes with the limit of 3 as the only ranking.
- **Due dates, recurring tasks, calendar** — Why parked: only time unit is "today".
- **Task notifications (email, push)** — Why parked: not needed to prove capture → focus.
- **History screen for completed days** — Why parked: data recorded (FR-009) but no screen in MVP.
- **Native mobile app** — Why parked: responsive web first.
- **Integrations (calendar, chat, mail)** — Why parked: no external sources in v1.
- **AI parsing / auto-focus** — Why parked: user picks the 3.
- **Offline-first / realtime sync** — Why parked: not a quality target for this MVP.
- **Title editing** — Why parked: delete and re-add per PRD §Non-Goals.
- **Payments and plans** — Why parked: free MVP; monetise after D1 return confirmed.

## Milestone History

## Done
