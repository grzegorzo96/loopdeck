---
project: loopdeck
researched_at: 2026-09-13T20:31:00Z
recommended_platform: Cloudflare Workers
runner_up: Railway
context_type: mvp
tech_stack:
  language: JavaScript / TypeScript
  framework: Astro 7 (SSR)
  runtime: Cloudflare Workers (workerd via @astrojs/cloudflare v14)
---

## Recommendation

**Deploy on Cloudflare Workers.**

Loopdeck is already scaffolded with `@astrojs/cloudflare` v14, Wrangler 4.x, and a Workers-native `wrangler.jsonc` — the stack, platform, and cost profile align without an adapter swap. At 10k–100k monthly requests the free tier ($0) or paid floor ($5/mo) fits the "minimize cost" priority. Global edge delivery matches the target geography. Supabase stays external as planned. Netlify and Vercel were filtered out because they cannot run always-on processes; Railway and Fly.io scored well for persistent connections but would require replacing `@astrojs/cloudflare` with `@astrojs/node` and abandoning the starter's first-class Cloudflare path.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent-readable docs | Stable deploy API | MCP / Integration | Total |
|---|---|---|---|---|---|---|
| **Cloudflare Workers** | Pass | Pass | Pass | Pass | Pass | **5.0** |
| Railway | Pass | Pass | Pass | Partial | Pass | 4.5 |
| Fly.io | Pass | Pass | Partial | Pass | Partial | 4.0 |
| Render | Partial | Pass | Pass | Partial | Pass | 4.0 |
| ~~Vercel~~ | — | — | — | — | — | *filtered* |
| ~~Netlify~~ | — | — | — | — | — | *filtered* |

**Cloudflare Workers** — Full marks on all five agent-friendly criteria. Wrangler CLI covers deploy, rollback, and log tailing. Docs ship as `/llms.txt` and markdown on GitHub. Managed MCP servers exist for docs, bindings, and observability. The `@astrojs/cloudflare` adapter is GA for Astro 7; Cloudflare Pages support was removed in adapter v13.

**Railway** — Strong container PaaS with always-on Node processes and WebSocket support. Excellent `llms.txt` docs and official MCP. Rollback is dashboard/API-only (no CLI rollback command), which costs a Partial on deploy API. Requires `@astrojs/node` adapter swap. Hobby plan is $5/mo + usage credit.

**Fly.io** — Firecracker microVMs with true persistent processes and WebSocket support (~$2+/mo per machine, no meaningful free tier). Docs are on GitHub with `llm_context.md` but no published `llms.txt`. MCP via `fly mcp server` is experimental. Requires Docker + `@astrojs/node`.

**Render** — Web Services with GA WebSocket support, but free tier spins down after 15 min idle (unsuitable for persistent connections). Starter instance is $7/mo minimum. No CLI rollback command. Requires `@astrojs/node`.

**Vercel (filtered)** — Serverless-only; WebSockets are public beta on Fluid compute. No always-on processes. Filtered per interview answer (persistent connections required).

**Netlify (filtered)** — Stateless Functions only; no WebSocket or persistent process support. Filtered per interview answer.

### Shortlisted Platforms

#### 1. Cloudflare Workers (Recommended)

Wins on stack alignment (adapter already installed and configured), cost ($0–5/mo at MVP traffic), global edge CDN, and perfect agent-friendly scores. Wrangler 4.x + `@astrojs/cloudflare` v14 deploy SSR via `astro build && wrangler deploy`. Supabase external DB works via fetch from edge. Trade-off: no always-on background processes (WebSockets possible via Durable Objects but add complexity the current PRD does not require).

#### 2. Railway

Best runner-up if persistent always-on Node processes become a hard requirement. Hobby tier ($5/mo) likely covers MVP traffic. Requires swapping `@astrojs/cloudflare` for `@astrojs/node` in standalone mode and rebinding to `0.0.0.0`. Rollback and preview deploys are less CLI-native than Wrangler.

#### 3. Fly.io

Third choice for persistent connections on real VMs. Cheapest always-on option (~$2/mo per shared-cpu machine) but no free tier for new accounts. Requires Docker, `@astrojs/node`, and operational attention to autostop/WebSocket reconnect behavior. MCP is experimental.

## Anti-Bias Cross-Check: Cloudflare Workers

### Devil's Advocate — Weaknesses

1. **`workerd` is not Node.js** — Supabase SSR, React 19 islands, and some npm packages may fail at runtime even with `nodejs_compat` enabled.
2. **Free tier CPU cap is 10 ms per invocation** — Astro SSR + React hydration can exceed this, pushing to the $5/mo paid tier sooner than expected.
3. **No always-on background processes** — WebSockets work via Durable Objects, but that adds architecture complexity the PRD does not currently require (no realtime, no background jobs).
4. **Edge-to-Supabase latency** — Every SSR request crosses the public internet to Supabase Postgres; no persistent TCP pooling unless Hyperdrive is added.
5. **Tech-stack drift** — `tech-stack.md` references Cloudflare Pages, but `@astrojs/cloudflare` v13+ deploys to Workers only.

### Pre-Mortem — How This Could Fail

The team deployed Loopdeck on Cloudflare Workers with Supabase, confident the free tier would carry them through MVP. Within six weeks, SSR routes with React islands routinely exceeded the 10 ms CPU limit, triggering unexpected overages on the $5/mo plan. A middleware bug (`[object Object]` responses with `nodejs_compat`) burned two days before they found the `disable_nodejs_process_v2` workaround. When they tried to add WebSocket-based live task sync (contradicting the original PRD), they discovered Workers have no persistent processes — Durable Objects required a rewrite of their state model. Supabase RLS queries from edge locations added 200–400 ms latency for users far from the Supabase region. The `@astrojs/cloudflare` v14 entrypoint pattern in `wrangler.jsonc` didn't match any tutorial, and GitHub Actions secret injection differed from local `wrangler secret put`. By month six, they were maintaining platform-specific workarounds instead of product features.

### Unknown Unknowns

- **`disable_nodejs_process_v2`** may be required if Astro middleware returns `[object Object]` with the current compat date (2026-05-08).
- **`astro dev` already runs on the Workers runtime** via Miniflare — a separate `wrangler dev` is not needed for local development with this adapter version.
- **Preview deploys** require Cloudflare Git integration or manual `wrangler deploy` per branch; there is no automatic preview URL from Astro alone.
- **Rollback** via `wrangler rollback` reverts the Worker script but not Supabase migrations — schema changes are one-way.
- **PRD excludes realtime and background jobs** — the interview answer "Yes" to persistent connections may reflect future plans; the current MVP does not need always-on processes.

## Operational Story

- **Preview deploys**: Connect the GitHub repo in the Cloudflare dashboard (Workers & Pages → Create → Connect to Git) for automatic preview URLs on PRs. Alternatively, run `npx wrangler deploy` manually from a feature branch. Fork PR previews require Cloudflare Access or manual deploy — they are not automatic.
- **Secrets**: Server secrets (`SUPABASE_URL`, `SUPABASE_KEY`) live in the Workers Secrets store. Set locally with `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY`. In CI, inject via GitHub Actions secrets mapped to `wrangler secret bulk` or the Cloudflare API. Only account admins can read secret values; rotation is `wrangler secret put` again (immediate, no redeploy needed).
- **Rollback**: `npx wrangler rollback [VERSION_ID]` reverts the Worker script to a prior deployment within seconds. List versions with `npx wrangler deployments list`. Database migrations in Supabase do not roll back automatically — plan migrations as forward-only.
- **Approval**: Production deploys (`wrangler deploy` to the default environment) and secret rotation should require human approval in CI (GitHub Environment protection rules). Preview deploys and log tailing (`wrangler tail`) are safe for agent-unattended use.
- **Logs**: `npx wrangler tail` streams live Worker logs; add `--status error` to filter. Cloudflare dashboard → Workers → Observability for persisted traces (enabled in `wrangler.jsonc`). MCP servers for Cloudflare observability provide structured log access for agents.

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| SSR routes exceed 10 ms CPU limit on free tier | Devil's advocate | M | M | Monitor CPU in Observability; upgrade to Paid ($5/mo) if needed; keep SSR routes lean |
| `workerd` runtime breaks npm packages (Supabase SSR, React) | Devil's advocate | M | H | Test all API routes locally via `astro dev` (Miniflare); keep `nodejs_compat` enabled; avoid Node-only packages |
| Middleware returns `[object Object]` with nodejs_compat | Unknown unknowns | L | M | Add `disable_nodejs_process_v2` to `compatibility_flags` if bug appears |
| Edge-to-Supabase latency for distant users | Devil's advocate | M | L | Pin Supabase project region near primary user base; acceptable for MVP per PRD (no latency SLA) |
| Persistent connections needed later but Workers can't run always-on processes | Pre-mortem | L | H | PRD excludes realtime/background jobs for MVP; if needed post-MVP, evaluate Railway/Fly.io migration path |
| `tech-stack.md` references deprecated Cloudflare Pages | Research finding | L | L | Update tech-stack hints to `cloudflare-workers` when convenient |
| Supabase migrations don't roll back with Worker rollback | Unknown unknowns | M | M | Treat DB migrations as forward-only; test in preview/staging Supabase project first |
| GitHub Actions secret injection differs from local wrangler | Unknown unknowns | M | L | Document CI secret setup in deployment runbook; use `wrangler secret bulk` in CI |

## Getting Started

These steps match the pinned versions in `package.json`: Astro 7.3, `@astrojs/cloudflare` 14.3, Wrangler 4.131.

1. **Authenticate Wrangler**: `npx wrangler login` — opens browser OAuth flow for your Cloudflare account.
2. **Set secrets locally**: `npx wrangler secret put SUPABASE_URL` and `npx wrangler secret put SUPABASE_KEY` (paste values from your Supabase project settings).
3. **Build and deploy**: `npm run build && npx wrangler deploy` — builds Astro SSR output to `dist/` and deploys the Worker + static assets per `wrangler.jsonc`.
4. **Verify locally first**: `npm run dev` — Astro dev server runs on the Workers runtime via Miniflare; no separate `wrangler dev` needed with this adapter version.
5. **Connect GitHub for CI**: In Cloudflare dashboard, link the repo for auto-deploy on merge to main (matches `tech-stack.md` CI default flow). Add `CLOUDFLARE_API_TOKEN` and account ID to GitHub Actions secrets.

## Out of Scope

The following were not evaluated in this research:

- Docker image configuration
- CI/CD pipeline setup (GitHub Actions workflow authoring)
- Production-scale architecture (multi-region failover, HA, DR)
