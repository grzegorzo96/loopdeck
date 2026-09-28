// Verifies @cursor/sdk can reach the selected model with structured code-review output.
// Requires CURSOR_API_KEY (or prior `Cursor.auth.login()` → ~/.cursor/sdk/auth.json).
//
// Usage: npm run sdk:verify
// Optional: SDK_MODEL=auto SDK_VERIFY_TIMEOUT_MS=120000 npm run sdk:verify

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, Cursor, CursorAgentError, FileCredentialStore, getDefaultSdkAuthPath } from "@cursor/sdk";
import { buildFullPrompt } from "./code-review/build-prompt.mjs";
import { parseReviewResponse } from "./code-review/parse-response.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MODEL_ID = process.env.SDK_MODEL ?? "composer-2.5";
const TIMEOUT_MS = Number(process.env.SDK_VERIFY_TIMEOUT_MS ?? "120000");

const diff = readFileSync(join(__dirname, "fixtures/code-review-diff.patch"), "utf8");
const prompt = buildFullPrompt(diff);

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
      console.log(`ℹ️  Using stored login (${status.email ?? "unknown"}) from ${getDefaultSdkAuthPath()}`);
      return creds.apiKey;
    }
  }

  return undefined;
}

async function main() {
  console.log("=== Cursor SDK verification (structured code review) ===");
  console.log(`Model: ${MODEL_ID}`);
  console.log(`Project: ${process.cwd()}`);

  const apiKey = await resolveApiKey();

  if (!apiKey) {
    console.error("\n❌ Brak CURSOR_API_KEY.");
    console.error('   Ustaw klucz: export CURSOR_API_KEY="cursor_..."');
    console.error("   Albo zaloguj SDK: npm run sdk:login");
    console.error("   Klucz: Cursor Dashboard → Integrations → User API Keys");
    process.exit(1);
  }

  console.log("\n1) Listing available models…");
  try {
    const models = await Cursor.models.list({ apiKey });
    const ids = models.map((m) => m.id);
    console.log(`   ✓ ${ids.length} models available`);
    if (!ids.includes(MODEL_ID) && MODEL_ID !== "auto") {
      console.warn(`   ⚠ Model "${MODEL_ID}" not in list; trying anyway. Sample: ${ids.slice(0, 3).join(", ")}`);
    }
  } catch (err) {
    if (err instanceof CursorAgentError) {
      console.error(`   ✗ Model list failed: ${err.message} (retryable=${err.isRetryable})`);
      process.exit(1);
    }
    throw err;
  }

  console.log("\n2) Sending structured code-review prompt with buggy diff fixture…");
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

    console.log(`\n   Run status: ${result.status}`);
    if (result.status === "error") {
      console.error("   ✗ Agent run failed mid-flight.");
      console.error(result.result ?? "(no result text)");
      process.exit(2);
    }

    const text = result.result ?? "";
    console.log("\n--- Model response ---\n");
    console.log(text);
    console.log("\n--- End response ---\n");

    const parsed = parseReviewResponse(text);
    if (!parsed.ok) {
      console.warn("⚠ Response is not valid structured JSON:");
      for (const err of parsed.errors) {
        console.warn(`   • ${err}`);
      }
      process.exit(3);
    }

    const productFail = parsed.review.criteria.product_invariants.verdict === "FAIL";
    if (!productFail) {
      console.warn("⚠ Buggy fixture should FAIL product_invariants — model may be too lenient.");
      process.exit(3);
    }

    console.log(`✅ SDK OK — structured review, overall=${parsed.review.overall_verdict}, product_invariants=FAIL`);
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof CursorAgentError) {
      console.error(`\n❌ Startup failed: ${err.message}`);
      console.error(`   retryable=${err.isRetryable}`);
      if (/401|auth|api key|unauthorized/i.test(err.message)) {
        console.error("   → Sprawdź CURSOR_API_KEY (bez spacji, poprawny backend).");
      }
      process.exit(1);
    }
    if (err?.name === "AbortError") {
      console.error(`\n❌ Timeout after ${TIMEOUT_MS}ms`);
      process.exit(1);
    }
    throw err;
  }
}

main();
