# Repository Guidelines

Loopdeck is a focus-limited todo web app (max 3 tasks per day) on Astro 7 SSR with React 19 islands, Tailwind 4, Supabase auth, and Cloudflare Workers. Read @context/foundation/prd.md for product rules and @CLAUDE.md for architecture depth.

## Hard Rules

- Enforce the "3 for today" limit server-side; see @context/foundation/prd.md acceptance criteria.
- API routes in `src/pages/api/` must export `const prerender = false` and use uppercase `GET`/`POST` handlers with zod validation.
- New Supabase tables require RLS with granular policies; migrations in `supabase/migrations/` as `YYYYMMDDHHmmss_short_description.sql`.
- Merge Tailwind classes with `cn()` from `@/lib/utils` — never concatenate class strings manually.
- React components must not use Next.js directives; extract hooks to `src/components/hooks/`.

## Project Structure

- `context/foundation/` — PRD, tech stack, and shaping docs; consult before feature work.
- Source layout and path aliases: @CLAUDE.md (Architecture / Key conventions).

## Build, Test, and Development Commands

- See @package.json for scripts; pre-commit config in @package.json (husky/lint-staged).

## Coding Style & Naming

- Coding conventions: @CLAUDE.md § Key conventions.

## Testing Guidelines

- `npm run test:unit` — pure logic (no Supabase).
- `npm run test:integration` — service-layer tests against local Supabase (export env per `vitest.config.ts`).
- `npm run test:e2e` — Playwright browser tests (requires running server).
- `npm run smoke` — auth-flow smoke against a live server.

## Commit & Pull Request Guidelines

- CI gates and required checks: @.github/workflows/ci.yml. Node version: @.nvmrc.
