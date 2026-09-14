# Account deletion and privacy policy — Plan Brief

> Full plan: `context/changes/account-deletion-privacy/plan.md`

## What & Why

Open registration requires a privacy policy before sign-up (NFR) and GDPR-compliant account deletion with all tasks removed (FR-001b).

## Starting Point

Auth baseline: sign-up/sign-in/sign-out via Supabase SSR. No privacy page, no account deletion. Tasks cascade on user delete via F-01 FK.

## Desired End State

`/privacy` readable without login; sign-up page links to it. Logged-in user can delete account from dashboard — auth user and all tasks permanently removed.

## Key Decisions Made

| Decision | Choice | Why | Source |
| -------- | ------ | --- | ------ |
| Privacy page | Static Astro page at `/privacy` | Simple, SSR, no auth | Plan |
| Sign-up link | Required link above submit on SignUpForm | NFR before sign-up | PRD |
| Account delete | `POST /api/auth/delete-account` + service role | Supabase requires admin API to delete auth user | Plan |
| New secret | `SUPABASE_SERVICE_ROLE_KEY` server-only in astro env | Needed for `auth.admin.deleteUser` | Plan |
| Task cleanup | FK ON DELETE CASCADE on tasks.user_id | F-01 schema handles FR-001b | F-01 |
| Confirm UX | Type "DELETE" or confirm dialog | Prevent accidental deletion | Plan |

## Scope

**In:** Privacy page, signup link, delete-account API, delete UI, env schema update, `.env.example`.

**Out:** Data export (GDPR portability), email confirmation of deletion.

## Phases at a Glance

| Phase | Delivers | Key risk |
| ----- | -------- | -------- |
| 1. Privacy page | `/privacy` + signup link | Copy must mention email collection |
| 2. Delete account | API + service role client + UI | Service role must never reach client |
| 3. Verification | Signup shows link; delete removes user + tasks | CI needs service role secret for full test |

**Prerequisites:** None (parallel with F-01). **Effort:** ~1 session, 3 phases.

## Open Risks & Assumptions

- Production Supabase project needs service role key in Cloudflare secrets.
- Local dev: `supabase status` provides service role key.

## Success Criteria (Summary)

- Privacy policy reachable before sign-up
- Account deletion removes auth user and all tasks
- lint/check/build pass
