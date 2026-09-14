import { describe, expect, it, vi } from "vitest";
import { createJwtSkewRetryFetch } from "@/lib/supabase-fetch";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createJwtSkewRetryFetch", () => {
  it("retries a PGRST303 JWT issued at future 401 and returns the next success", async () => {
    const fetchImpl = vi
      .fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(jsonResponse(401, { code: "PGRST303", message: "JWT issued at future" }))
      .mockResolvedValueOnce(jsonResponse(200, { focus: [], backlog: [] }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchWithRetry = createJwtSkewRetryFetch({ fetch: fetchImpl, sleep, delaysMs: [250] });

    const response = await fetchWithRetry("https://example.test/rest/v1/tasks");

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(250);
    await expect(response.json()).resolves.toEqual({ focus: [], backlog: [] });
  });

  it("does not retry a different 401", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(401, { code: "PGRST301", message: "No suitable key" }));
    const sleep = vi.fn();
    const fetchWithRetry = createJwtSkewRetryFetch({ fetch: fetchImpl, sleep, delaysMs: [250] });

    const response = await fetchWithRetry("https://example.test/rest/v1/tasks");

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("returns the last PGRST303 response after retries are exhausted", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse(401, { code: "PGRST303", message: "JWT issued at future" }));
    const sleep = vi.fn().mockResolvedValue(undefined);
    const fetchWithRetry = createJwtSkewRetryFetch({ fetch: fetchImpl, sleep, delaysMs: [10, 20] });

    const response = await fetchWithRetry("https://example.test/rest/v1/tasks");

    expect(response.status).toBe(401);
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
    await expect(response.json()).resolves.toEqual({ code: "PGRST303", message: "JWT issued at future" });
  });
});
