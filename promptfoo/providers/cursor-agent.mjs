import { Agent, CursorAgentError } from "@cursor/sdk";
import { buildFullPrompt } from "../../scripts/code-review/build-prompt.mjs";

export default class CursorAgentProvider {
  constructor(options) {
    this.providerId = options.id || "cursor-agent";
    this.config = options.config ?? {};
  }

  id() {
    return this.providerId;
  }

  async callApi(_prompt, context) {
    const apiKey = process.env.CURSOR_API_KEY?.trim();
    if (!apiKey) {
      return { error: "CURSOR_API_KEY is not set" };
    }

    const diff = context?.vars?.diff;
    if (!diff) {
      return { error: "Test var `diff` is required" };
    }

    const model = this.config.model ?? "composer-2.5";
    const timeoutMs = Number(this.config.timeoutMs ?? process.env.SDK_REVIEW_TIMEOUT_MS ?? "180000");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = Date.now();

    try {
      const result = await Agent.prompt(buildFullPrompt(diff), {
        apiKey,
        model: { id: model },
        local: { cwd: process.cwd(), settingSources: [] },
        signal: controller.signal,
      });

      clearTimeout(timer);
      const latencyMs = Date.now() - started;

      if (result.status === "error") {
        return { error: result.result ?? "Agent run failed", latencyMs };
      }

      return {
        output: result.result ?? "",
        latencyMs,
      };
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof CursorAgentError) {
        return { error: err.message, latencyMs: Date.now() - started };
      }
      if (err?.name === "AbortError") {
        return { error: `Timeout after ${timeoutMs}ms`, latencyMs: Date.now() - started };
      }
      throw err;
    }
  }
}
