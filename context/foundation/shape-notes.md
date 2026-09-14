---
project: Loopdeck
context_type: greenfield
created: 2026-09-07
updated: 2026-09-07
product_type: web-app
target_scale:
  users: small
timeline_budget:
  mvp_weeks: 3
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: pain category
      decision: decision paralysis — za dużo otwartych zadań, brak decyzji "co teraz"
    - topic: insight
      decision: limit 3 na dziś JEST produktem — inne listy nagradzają gromadzenie, nie kończenie
    - topic: primary persona scope
      decision: jeden konkretny użytkownik, w tym ja
    - topic: auth strategy
      decision: login (sign-up / sign-in); flat user model; each user sees only their own tasks; no roles
    - topic: mvp timeline
      decision: 3 weeks after-hours; first flow as sketched in idea-notes
    - topic: product type
      decision: website or web app
    - topic: target scale
      decision: just me or a handful; at 100× the per-person limit of 3 stays
    - topic: non-goals
      decision: no teams/taxonomy/calendar/notifications/mobile/AI/integrations/offline-first; no title edit
  frs_drafted: 7
  quality_check_status: accepted
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

## The central decision

The limit of 3 has two readings, and they produce two different products. This is the single decision the whole plan hangs on.

**(a) A slot frees when the task is completed.** The limit means "at most 3 in progress at once". The day is unbounded — finish three, start three more. This is an ordinary task list with a small work-in-progress cap. It is friendlier, and it is not worth building, because it has no thesis.

**(b) A slot is held until the day resets.** The limit means "at most 3 tasks per day, full stop". The day *ends*. This is what the Vision claims ("forces a small daily set"), so this is what gets built.

Reading (b) is chosen. The consequence is uncomfortable and should be faced rather than smoothed over: someone who finishes three things before noon has, by the product's own rule, nothing left to do. That is not a defect to be patched later — it is the product working. Whether people accept it is exactly what the D1 return metric measures.

Two softer rules follow from this choice:

- **Unsetting an unfinished task frees its slot.** This is a deliberate escape hatch. The limit can be bypassed by swapping continuously. The alternative — trapping a person in three choices made at 9 a.m. — would be discipline by imprisonment, and people abandon products that do that. If the data shows mass bypass, harden it then.
- **Completion is only possible from focus.** Otherwise a person can work a full day straight out of the backlog, and focus is decoration. This is the least popular rule in the product and needs the most careful wording in the UI.

## Success Criteria

These are a funnel, not an acceptance test. The numbers below are hypotheses to be falsified across the first ~50 sign-ups, not fixed targets.

### Primary
- **Activation:** ≥ 60% of registered accounts add at least one task and set it as today's focus in their first session.
- **D1 return:** ≥ 30% of accounts that set a focus come back the next day and set a new one. This is the main test of the product: if the limit works, the day ends, and there is a reason to return tomorrow. If people do not return, the limit is an irritation rather than a feature.
- **Limit enforcement:** an attempt to place a fourth task into focus is refused and resolves either as a deliberate cancellation or as an explicit swap — never as a silent addition.

### Secondary
- ≥ 50% of days with a focus set end with at least 1 of the 3 tasks completed.
- The median number of tasks in focus is 2–3. If people systematically set 1, the limit of 3 is irrelevant and the product thesis fails.

### Guardrails
- Tasks do not disappear between sessions (except on explicit deletion or completion).
- Tasks belonging to one account are never visible to another account.
- The day reset never deletes a task — it only removes it from focus.

## What "multi-user" actually changes

The architecture was already multi-user: accounts, per-account isolation, no shared state. Moving from "for me" to "for strangers" is therefore not a technical change. What it changes is everything the author was silently supplying by knowing the product.

- **The rule must be legible without the author.** One sentence on the empty screen, plus the refusal message when a fourth focus is blocked. That is the entire onboarding — no tours, no checklists, no wizards.
- **The limit must be enforced server-side.** Client-side validation is a hint. With strangers, an unenforced rule is not a rule, and here the rule *is* the product.
- **Auth grows a tail.** Password reset, email verification, account deletion, sign-up abuse resistance, a privacy policy. None of these exist when the only user is the author; all are mandatory now. Use an off-the-shelf provider — hand-rolling this eats the entire budget.
- **Defaults must be decided, not improvised.** Backlog ordering, where completed tasks go, what deletion does to a slot. With three tasks and one user these resolve themselves in the moment; with two hundred tasks and a hundred users they have to be written down.
- **The metrics must be instrumented.** Five numeric targets require recorded events: account creation, first task, each focus day, each completion with its focus day. The product's own data is enough; no third-party analytics needed.

## Data Model (minimum)

Not a full schema — only the fields forced by the decisions above.

**`user`** — supplied by the auth provider.

**`task`**
| field | type | notes |
|---|---|---|
| `id` | uuid | |
| `user_id` | uuid | FK; every query filters on it |
| `title` | text | the only content field |
| `created_at` | timestamptz | backlog order, newest first |
| `focus_date` | date, nullable | null = backlog; a date = focus for that day |
| `completed_at` | timestamptz, nullable | null = open |

`focus_date` is the load-bearing idea. "Today's focus" is the query `focus_date = <user's local date>`, with the client supplying its local date on read and write. The day resets by itself: no scheduled job, no stored timezone, no DST handling, and travel across time zones is correct by construction. The server rejects a supplied date more than ±1 day from UTC.

A completion is attributed to the task's `focus_date`. This is the concrete reason completion is restricted to tasks in focus: a backlog task has no focus day to attribute to, which would leave both the data model and the Secondary metric undefined.

The limit is `COUNT(*) WHERE user_id = ? AND focus_date = ?` < 3, evaluated on the server.

## Build shape

Roughly in dependency order, not as a schedule.

1. Auth via provider, with the account-deletion path wired from the start rather than bolted on.
2. Task table and CRUD, per-account isolation enforced at the data-access layer.
3. Focus set/unset with the server-side count check — this is the core; build it before any UI polish.
4. The refusal-and-swap interaction. Budget real time for the wording here; it carries the product's entire explanation.
5. Empty state, done-marking, the "2 of 3 done" readout.
6. Event recording for the metrics.

**Budget.** Three weeks of after-hours work holds only with an off-the-shelf auth provider and no custom session backend. If auth is hand-rolled, cut scope or move the date.

## Non-Goals

- Shared lists, teams, admin/member/guest roles — one person per account; flat model locked.
- Projects, tags, subtasks, priorities beyond the limit of 3 — taxonomy would compete with the daily cap as the only ranking.
- Due dates, recurring tasks, calendar — the only unit of time is "today".
- Task notifications (email, push). This does not cover transactional mail (password reset, verification), which is in scope.
- A history screen for completed days — the data is recorded, the screen is not built.
- Native mobile app — first ship is responsive web.
- Integrations (calendar, chat, mail) — no external sources in v1.
- AI (natural-language parsing, automatic focus selection) — the user picks the 3.
- Offline-first and realtime sync across devices — not a quality target here.
- Editing a task title — delete and re-add instead.
- Payments and plans — free MVP; monetisation only after D1 return is confirmed.

## Open Questions

1. **Does the day reset at local midnight or at 4:00 a.m.?** Working decision: local midnight, simpler and consistent with the local-date model. Risk: someone working at 1:00 a.m. loses their focus mid-session. Same question covers a session left open across midnight. Owner: user.
2. **Should setting a focus "for tomorrow" be allowed?** Working decision: no — the only unit of time is "today". The data model would technically permit it, which is exactly why the rejection is written down. Owner: user.
3. **How many swaps per day is too many?** No limit in the MVP. Data needed: distribution of swaps per user per day. Owner: user.
4. **Open registration or invite-only?** Invite-only gives cleaner data from the first 50 people and less spam; open gives a faster signal. Decide before launch. Owner: user.

## Risks

- **The rule is rejected rather than adopted.** Most likely failure. Signal: activation is fine, D1 return is not. Means people tried it once and found the cap annoying rather than freeing.
- **The escape hatch swallows the rule.** People swap all day and the cap constrains nothing. Signal: high swap counts, median focus size at 3, and completions well above 3 per day.
- **Completion-from-focus-only reads as broken.** Signal: people add duplicates of backlog tasks instead of focusing the originals.
- **Scope creep through the auth tail.** Signal: week two spent on email flows rather than the focus interaction.
