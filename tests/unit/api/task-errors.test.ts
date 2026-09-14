import { describe, expect, it } from "vitest";
import { taskErrorResponse } from "@/lib/api/task-errors";

async function parseResponse(response: Response) {
  return {
    status: response.status,
    body: (await response.json()) as { code: string; message: string },
  };
}

describe("taskErrorResponse", () => {
  it("maps focus_limit_exceeded to 409", async () => {
    const { status, body } = await parseResponse(taskErrorResponse("focus_limit_exceeded"));
    expect(status).toBe(409);
    expect(body).toEqual({
      code: "focus_limit_exceeded",
      message: "Three for today is the whole day.",
    });
  });

  it("maps complete_requires_focus to 422", async () => {
    const { status, body } = await parseResponse(taskErrorResponse("complete_requires_focus"));
    expect(status).toBe(422);
    expect(body.code).toBe("complete_requires_focus");
  });

  it("maps not_found to 404", async () => {
    const { status, body } = await parseResponse(taskErrorResponse("not_found"));
    expect(status).toBe(404);
    expect(body.code).toBe("not_found");
  });

  it("falls back to 500 for unknown reasons", async () => {
    const { status, body } = await parseResponse(taskErrorResponse("unexpected_reason"));
    expect(status).toBe(500);
    expect(body.code).toBe("internal_error");
  });
});
