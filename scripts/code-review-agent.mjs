#!/usr/bin/env node
// CI/CD code review agent — structured JSON verdict per criterion.
//
// Usage:
//   npm run review:diff -- scripts/fixtures/code-review-diff.patch
//   git diff main...HEAD | npm run review:diff
//   npm run review:diff -- --dry-run scripts/fixtures/code-review-diff-good.patch
//
// Env: CURSOR_API_KEY, SDK_MODEL (default composer-2.5), SDK_REVIEW_TIMEOUT_MS (default 180000)

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, Cursor, CursorAgentError, FileCredentialStore, getDefaultSdkAuthPath } from "@cursor/sdk";
import { buildFullPrompt } from "./code-review/build-prompt.mjs";
import { gateAllowsMerge, parseReviewResponse } from "./code-review/parse-response.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_ID = process.env.SDK_MODEL ?? "composer-2.5";
const TIMEOUT_MS = Number(process.env.SDK_REVIEW_TIMEOUT_MS ?? "180000");

function loadDotEnvKey() {
  for (const file of [".env", ".env.local"]) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, "utf8").split("\n")) {
      const match = line.match(/^\s*CURSOR_API_KEY\s*=\s*(.+?)\s*$/);
      if (match) return match[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  return undefined;
}

async function resolveApiKey() {
  const fromEnv = process.env.CURSOR_API_KEY?.trim() || loadDotEnvKey();
  if (fromEnv) return fromEnv;

  const status = await Cursor.auth.status();
  if (status.status === "logged-in") {
    const store = new FileCredentialStore();
    const creds = await store.load();
    if (creds?.apiKey) {
      console.error(`ℹ️  Using stored login (${status.email ?? "unknown"}) from ${getDefaultSdkAuthPath()}`);
      return creds.apiKey;
    }
  }

  return undefined;
}

function readDiffFromArgs(args) {
  const dryRun = args.includes("--dry-run");
  const ciMode = args.includes("--ci");
  const jsonOutIdx = args.indexOf("--json-out");
  const jsonOut = jsonOutIdx !== -1 ? args[jsonOutIdx + 1] : undefined;
  const paths = args.filter((a, i) => !a.startsWith("-") && i !== jsonOutIdx + 1);

  if (paths.length > 0) {
    return { diff: readFileSync(paths[0], "utf8"), dryRun, ciMode, jsonOut, source: paths[0] };
  }

  if (!process.stdin.isTTY) {
    return { diff: readFileSync(0, "utf8"), dryRun, ciMode, jsonOut, source: "stdin" };
  }

  console.error("Usage: npm run review:diff -- [--dry-run] [--ci] [--json-out review.json] <patch-file>");
  console.error("       git diff main...HEAD | npm run review:diff");
  process.exit(1);
}

function printReview(review) {
  console.log("\n=== Code review (structured) ===\n");
  console.log(`Summary: ${review.summary}`);
  console.log(`Overall: ${review.overall_verdict}\n`);

  for (const [id, result] of Object.entries(review.criteria)) {
    const icon = result.verdict === "PASS" ? "✅" : "❌";
    console.log(`${icon} ${id}: ${result.verdict}`);
    for (const finding of result.findings) {
      console.log(`   • ${finding}`);
    }
  }
  console.log("");
}

async function main() {
  const { diff, dryRun, ciMode, jsonOut, source } = readDiffFromArgs(process.argv.slice(2));

  if (!diff.trim()) {
    console.error("❌ Empty diff — nothing to review.");
    process.exit(1);
  }

  console.log(`=== Loopdeck code review agent ===`);
  console.log(`Source: ${source}`);
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Diff size: ${diff.length} chars`);

  const prompt = buildFullPrompt(diff);

  if (dryRun) {
    console.log("\n--- Prompt (dry-run, first 1200 chars) ---\n");
    console.log(prompt.slice(0, 1200));
    console.log("\n... [truncated] ---\n");
    process.exit(0);
  }

  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.error("\n❌ Brak CURSOR_API_KEY. Ustaw klucz lub uruchom npm run sdk:login");
    process.exit(1);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const result = await Agent.prompt(prompt, {
      apiKey,
      model: { id: MODEL_ID },
      local: { cwd: process.cwd(), settingSources: [] },
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (result.status === "error") {
      console.error("❌ Agent run failed:", result.result ?? "(no text)");
      process.exit(2);
    }

    const raw = result.result ?? "";
    const parsed = parseReviewResponse(raw);

    if (!parsed.ok) {
      console.error("❌ Invalid structured response:");
      for (const err of parsed.errors) {
        console.error(`   • ${err}`);
      }
      console.error("\n--- Raw model output ---\n");
      console.error(raw);
      process.exit(3);
    }

    printReview(parsed.review);

    if (jsonOut) {
      writeFileSync(jsonOut, `${JSON.stringify(parsed.review, null, 2)}\n`);
      console.log(`Wrote structured review to ${jsonOut}`);
    }

    if (gateAllowsMerge(parsed.review)) {
      console.log("✅ Gate: APPROVE — merge allowed");
      process.exit(0);
    }

    console.log(`🛑 Gate: ${parsed.review.overall_verdict} — merge blocked`);
    process.exit(ciMode ? 0 : 4);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof CursorAgentError) {
      console.error(`❌ Startup failed: ${err.message}`);
      process.exit(1);
    }
    if (err?.name === "AbortError") {
      console.error(`❌ Timeout after ${TIMEOUT_MS}ms`);
      process.exit(1);
    }
    throw err;
  }
}

main();
