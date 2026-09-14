---
starter_id: 10x-astro-starter
package_manager: npm
project_name: loopdeck
hints:
  language_family: js
  team_size: solo
  deployment_target: cloudflare-workers
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: first-class
  path_taken: standard
  quality_override: false
  self_check_answers: null
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
---

## Why this stack

Loopdeck is a solo, after-hours web MVP with a 3-week budget, external auth, per-user task data, and server-side enforcement of the rule of 3 — requirements the recommended JavaScript default covers out of the box. Astro + Supabase delivers sign-up, password reset, email verification, and PostgreSQL with row-level security without hand-rolling auth; Cloudflare Pages handles responsive web deploy. The stack clears all four agent-friendly gates and matches the PRD's constraint to ship fast with an off-the-shelf auth provider. Payments, AI, realtime sync, and background jobs are explicitly out of scope. CI runs on GitHub Actions with auto-deploy on merge to main.
