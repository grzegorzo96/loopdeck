---
project: Loopdeck
version: 1
status: draft
created: 2026-09-13
context_type: greenfield
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

# Loopdeck

## Vision & Problem Statement

Knowledge workers keep tasks in notes, chats, and their heads. The list grows faster than it gets done, so in the morning they cannot tell what to do first. The cost: time spent choosing, a feeling of overload, and postponing everything.

The problem is not the absence of a list — it is the absence of a limit on "today". A hard limit of 3 for today *is* the product: ordinary lists reward accumulating, not finishing. The app does not compete with a full task manager; it forces a small daily set.

The limit is always per person (max 3 in today's focus). Scaling adds accounts, not a shared focus.

## User & Persona

**Primary: "Kasia, solo operator".** Works alone or in a small team, with no manager to set her priorities. Carries somewhere between 20 and 200 open tasks scattered across Notion, Slack, and paper. She has tried full task managers and abandoned them because maintaining the system became a task of its own.

**Moment of use:** morning, the first five minutes at the desk, at the question "what now". She returns to the product when there are too many open tasks to decide without an imposed limit.

**What the persona does not want:** configuring a system, categories, projects, integrations. If the first run requires setup, she will not come back.

**Multi-user context:** the persona does not know the product's premise. She must understand the "3 for today" rule from the interface alone, with no documentation and no onboarding longer than one screen.

## Success Criteria

These are a funnel, not an acceptance test. The numbers below are hypotheses to be falsified across the first ~50 sign-ups, not fixed targets.

### Primary
- **Activation:** ≥ 60% of registered accounts add at least one task and set it as today's focus in their first session.
- **D1 return:** ≥ 30% of accounts that set a focus come back the next day and set a new one. This is the main test of the product: if the limit works, the day *ends*, and there is a reason to return tomorrow. If people do not return, the limit is an irritation rather than a feature.
- **Limit enforcement:** an attempt to place a fourth task into focus is refused and resolves either as a deliberate cancellation or as an explicit swap — never as a silent addition.

### Secondary
- ≥ 50% of days with a focus set end with at least 1 of the 3 tasks completed.
- The median number of tasks in focus is 2–3. If people systematically set 1, the limit of 3 is irrelevant and the product thesis fails.

### Guardrails
- Tasks do not disappear between sessions (except on explicit deletion or completion).
- Tasks belonging to one account are never visible to another account.
- The day reset never deletes a task — it only removes it from focus.

## User Stories

### US-01: Capture to today's focus

- **Given** a logged-in user with fewer than 3 tasks in today's focus
- **When** they add a task and set it as today's focus
- **Then** the task is in today's focus (not waiting in the backlog as "later")

#### Acceptance Criteria
- Task is added with a title only
- Setting it as focus succeeds when fewer than 3 slots for today are taken
- The action works in one flow — adding and focusing does not require visiting two screens

### US-02: Hitting the limit

This is the moment where the product either sells itself or dies. To a stranger, a block without an explanation reads as a bug.

- **Given** a logged-in user whose today's focus already holds 3 slots
- **When** they try to set a fourth task as today's focus
- **Then** the action is refused, the reason is stated in one sentence, and they are offered an explicit swap

#### Acceptance Criteria
- The refusal names the rule ("three for today is the whole day"), not a generic error
- The user can pick which of the current 3 leaves focus, and the new task takes its slot, in the same interaction
- Cancelling the swap leaves today's focus untouched and the new task in the backlog
- A **completed** task still occupies its slot — completing does not free room for a fourth (see FR-004a)

### US-03: A new day

- **Given** a user who left yesterday with unfinished tasks in focus
- **When** they open the product on a new local calendar day
- **Then** today's focus is empty, the unfinished tasks are back in the backlog, and nothing was deleted

#### Acceptance Criteria
- Completed tasks stay completed and do not return to the backlog
- The reset requires no action from the user and no scheduled background process
- Yesterday's focus remains recorded for measurement (see FR-009)

### US-04: Finishing a task

- **Given** a logged-in user with a task in today's focus
- **When** they mark it as done
- **Then** it is recorded as completed on today's focus day, stays visible in focus as done, and its slot remains taken

#### Acceptance Criteria
- Only a task in today's focus can be marked as done (see FR-005b)
- The completion is attributed to today's focus day, making the Secondary metric computable
- The count of completed slots is visible at a glance ("2 of 3 done")

## Functional Requirements

### Authentication

- FR-001: User can sign up and sign in. Priority: must-have
  > Socrates: Counter-argument considered: hand-rolled auth would consume the 3-week after-hours budget and still need password reset, email verification, and signup abuse resistance for external users. Resolution: authentication is provided by an external auth provider, not a custom session implementation.

- FR-001a: User can reset a forgotten password and verify their email address. Priority: must-have
  > Socrates: Counter-argument considered: unnecessary for a single known user. Resolution: kept for multi-user; transactional mail (reset, verification) is part of auth, not task notifications.

- FR-001b: User can delete their account together with all their tasks. Priority: must-have
  > Socrates: Legal (GDPR) and hygiene requirement. Resolution: deletion permanently removes the account and all of its tasks.

- FR-001c: Sign-up resists automated mass account creation without locking out a legitimate person who mistypes. Priority: must-have
  > Socrates: Open registration without abuse resistance invites bots. Resolution: usually delivered by the external auth provider from FR-001.

### Onboarding

- FR-008: A first-time user sees an empty state that states the rule before they add anything. Priority: must-have
  > Socrates: A new user does not know why the limit of 3 exists — an empty list looks like another Todoist. Resolution: one sentence on the empty screen plus the refusal message when a fourth focus is blocked (US-02). That is the whole onboarding — no tours, no checklists, no multi-step wizards.

### Tasks

- FR-002: User can add a task with a title. Priority: must-have
  > Socrates: Counter-argument considered: "optional description is a second field the MVP does not need." Resolution: revised; title only.

- FR-003: User can see a backlog of open tasks outside today's focus. Priority: must-have
  > Socrates: Counter-argument considered: "a visible backlog sabotages the limit of 3 — the user sees everything again." Resolution: kept; the limit applies to today's focus, not to hiding the list.

- FR-003a: User can see the backlog in a defined order: newest first. Priority: must-have
  > Socrates: With three tasks irrelevant; with two hundred, order matters. Undefined order is non-deterministic UI. Resolution: newest first.

- FR-005: User can mark a task as done. Priority: must-have
  > Socrates: Counter-argument considered: "done is a second state — removing from focus or deleting would suffice." Resolution: kept; completion is not deletion; Secondary success requires finishing at least one task.

- FR-005a: A task completed today stays visible in today's focus, marked as done, until the day resets. Priority: must-have
  > Socrates: A disappearing task removes the only reward the product gives — seeing "2 of 3 done". Resolution: completed tasks from prior days do not return to any list; they remain as recorded data only, with no history screen in MVP.

- FR-005b: Completion is available only for a task in today's focus. A backlog task must be moved into focus before it can be marked as done. Priority: must-have
  > Socrates: Left undefined in v2. Counter-argument considered: "blocking completion from the backlog is a surprising restriction the user will hit in week one." Resolution: kept anyway, because the alternative breaks the product. If any task can be ticked off from the backlog, a person can do a full day's work straight out of the backlog and focus becomes decoration — the daily cap stops constraining anything. It also leaves FR-009 with an undefined case (a completion belonging to no focus day) and contaminates the Secondary metric with work the limit never governed. The cost is one extra click; the refusal must explain it in the same voice as US-02.

- FR-006: User can delete a task. Priority: must-have
  > Socrates: Counter-argument considered: "title editing is empty CRUD — delete and re-add is enough." Resolution: revised; delete stays, title edit dropped from MVP.

- FR-006a: Deleting a task that is in today's focus frees its slot, exactly as unsetting it does. Priority: must-have
  > Socrates: Left undefined in v2. Counter-argument considered: "delete becomes a cheap bypass of the limit, cheaper than the explicit swap in US-02." Resolution: the bypass concern is already conceded in FR-004b — unset frees a slot by design, so delete behaving the same adds no new hole. The alternative (a deleted task keeps its slot until day end) means a typo costs a third of the day and would be read as a bug. Consistent behaviour wins.

### Today's focus

- FR-004: User can set / unset a task as today's focus, with a limit of 3. Priority: must-have
  > Socrates: Counter-argument considered: "a rigid 3 is wrong — some days need 1, some 7." Resolution: kept; the hard limit of 3 is the product.

- FR-004a: Completing a task does not free its slot; the slot is held until the day resets. Priority: must-have
  > Socrates: Two interpretations of the limit yield two products: (a) slot frees on completion → "max 3 in progress at once", unlimited day — a list with a small WIP; (b) slot held until day end → hard limit of 3 tasks per day. Resolution: (b), because Vision says "forces a small daily set", not "small set at once". Risk: finishing 3 before noon leaves nothing left to do — intentional; visible in the D1 return metric.

- FR-004b: Unsetting an unfinished task frees its slot; the freed slot can be filled the same day. Priority: must-have
  > Socrates: The limit can be bypassed by continuous swaps. Resolution: kept as a deliberate escape hatch — discipline, not a prison. If data shows mass bypass, harden later.

### Persistence

- FR-007: User can keep tasks across sessions; unfinished focus returns to the backlog at the start of a new calendar day in the user's local date. Priority: must-have
  > Socrates: Counter-argument considered: "'new day' without a defined timezone/reset is ambiguous and will break focus." Resolution: kept and clarified; new day = the user's local calendar date. The reset takes effect when the product is next read on a new local date — no user action required and no scheduled background process. Travel across time zones behaves correctly because the user's local calendar date is used at both read and write time. A session left open across midnight is covered by Open Question 1.

- FR-009: The system records, per task, when it was completed and for which focus day. Priority: must-have
  > Socrates: Without completion time and association to a focus day, the Secondary metric ("finished ≥1 of 3 that day") is unmeasurable. Resolution: record both.

- FR-010: The system records the events needed to compute the Primary metrics: account creation, first task added, each focus-day on which a focus was set. Priority: must-have
  > Socrates: v2 stated five numeric targets while FR-009 covered only completions — activation and D1 return were unmeasurable as specified. Resolution: record the minimum event set; no third-party analytics required, the product's own data suffices.

## Non-Functional Requirements

- Tasks belonging to one account are never visible to another account. Enforced at the data-access layer, not by UI routing alone.
- **The limit of 3 is enforced server-side.** Client-side validation is a hint only. With strangers on the product, an unenforced rule is not a rule — and the rule of 3 is the product.
- After closing and reopening the product, the user sees the same backlog and today's focus as when they left (except for an explicit delete, an explicit completion, or a local-date day reset).
- A privacy policy is available before sign-up — required when collecting email addresses from people the operator does not personally know.
- The product remains usable on a phone screen in a browser. It is not a native app (see Non-Goals), but the morning use moment often happens on a phone.

## Business Logic

Open tasks live in the backlog. For a given day the user may mark at most 3 of them as focus — only those count as "to do now". Completing one does not free its slot; unfinished ones return to the backlog at the start of a new day.

The inputs the rule consumes: the user's set of open tasks and their local date. The output: every task is either in today's focus, in the backlog, or completed. At the start of a new local date, today's slots are empty automatically, without deleting anything. The user meets this as two sets (focus vs backlog) and a hard stop when trying to place a fourth task into focus — with an explicit swap available.

## Access Control

Login with sign-up and sign-in, handled by an external auth provider. Flat user model: a logged-in person sees only their own tasks. No admin / member / guest roles. Unauthenticated visitors cannot use the product — they see only the entry page, a description of the rule of 3, and the privacy policy.

## Non-Goals

- Shared lists, teams, admin/member/guest roles — MVP is one person per account; flat model already locked.
- Projects, tags, subtasks, and priorities beyond the limit of 3 — taxonomy would compete with the daily cap as the only ranking.
- Due dates, recurring tasks, and calendar — the only time unit is "today".
- Task notifications (email, push) — not needed to prove capture → focus. **This does not cover transactional mail** (password reset, address verification), which is in scope as FR-001a.
- A history screen for completed days — the data is recorded (FR-009, FR-010) but no screen ships in the MVP.
- Native mobile app — first ship is web (responsive).
- Integrations (calendar, chat, mail) — no external sources in v1.
- AI (natural-language parsing, automatic focus selection) — the user picks the 3.
- Offline-first and realtime sync across devices — not a quality target for this MVP.
- Editing a task title — dropped in Socrates; delete and re-add instead.
- Payments and plans — the MVP is free; monetisation only after D1 return is confirmed.

## Open Questions

1. **Does the day reset at local midnight or at 4:00 a.m.?** Working decision: local midnight, as it is simpler and matches the local-date model. Risk: someone working at 1:00 a.m. loses their focus mid-session. The same question covers a session left open across midnight — whether the open view resets in place, or holds until the next load. To be validated against data. Owner: user.
2. **Should setting a focus "for tomorrow" be allowed?** Working decision: no — the only unit of time is "today". A deliberate rejection. Owner: user.
3. **How many swaps per day is too many?** No limit in the MVP (FR-004b). Data needed: the distribution of swaps per user per day. Owner: user.
4. **Open registration or invite-only?** Invite-only gives cleaner data from the first 50 people and less spam; open registration gives a faster signal. To be decided before launch. Owner: user.

## Quality cross-check

All greenfield elements present: Access Control, one-sentence Business Logic, project artifacts, Non-Goals, Open Questions with owners.

**Budget note.** Versions 2 and 3 added FR-001a/b/c, FR-005b, FR-006a, FR-008, FR-009, and FR-010 on top of the original scope. The 3-week after-hours MVP still holds **only** with an off-the-shelf auth provider and no custom session backend. If auth is to be hand-rolled, either cut scope or move the date.

Status: accepted.

---

## Changelog v2 → v3

| Change | Reason |
|---|---|
| Whole document in English | v2 mixed Polish and English; unusable for a collaborator or contractor |
| FR-005b: completion only from today's focus | Completing from the backlog was undefined and would let a user work a full day outside focus, voiding the product thesis and contaminating the Secondary metric |
| FR-006a: deleting a focused task frees its slot | Undefined in v2; resolved consistently with FR-004b |
| NFR: server-side enforcement of the limit | Dropped along with v2's data-model section; client-only validation means nothing with external users |
| FR-010: record events for activation and D1 return | Five numeric targets were stated while only completions were being recorded |
| US-04 added | Completion had requirements but no story, and the new FR-005b constraint needed acceptance criteria |
| Open Question 1 extended | Covers the session left open across midnight, previously an inconsistency in FR-007 |
| Budget note restored in Quality cross-check | Scope grew by eight requirements with no reminder of what the 3-week estimate depends on |
