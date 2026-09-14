import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isFocusLimitDbError, validateFocusDate } from "@/lib/services/tasks";

describe("validateFocusDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-14T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("accepts today", () => {
    expect(validateFocusDate("2026-09-14")).toEqual({ ok: true, date: "2026-09-14" });
  });

  it("accepts yesterday and tomorrow within the window", () => {
    expect(validateFocusDate("2026-09-13").ok).toBe(true);
    expect(validateFocusDate("2026-09-15").ok).toBe(true);
  });

  it("rejects invalid format", () => {
    expect(validateFocusDate("14-09-2026")).toEqual({ ok: false, reason: "invalid_focus_date_format" });
  });

  it("rejects invalid calendar date", () => {
    expect(validateFocusDate("2026-02-30")).toEqual({ ok: false, reason: "invalid_focus_date" });
  });

  it("rejects dates outside the ±1 day window", () => {
    expect(validateFocusDate("2026-09-12")).toEqual({ ok: false, reason: "invalid_focus_date" });
    expect(validateFocusDate("2026-09-16")).toEqual({ ok: false, reason: "invalid_focus_date" });
  });
});

describe("isFocusLimitDbError", () => {
  it("detects P0001 postgres errors", () => {
    expect(isFocusLimitDbError({ code: "P0001", message: "focus_limit_exceeded" })).toBe(true);
  });

  it("detects message on Error instances", () => {
    expect(isFocusLimitDbError(new Error("focus_limit_exceeded"))).toBe(true);
  });

  it("detects string errors", () => {
    expect(isFocusLimitDbError("focus_limit_exceeded")).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    expect(isFocusLimitDbError(new Error("not_found"))).toBe(false);
    expect(isFocusLimitDbError({ code: "23505", message: "duplicate key" })).toBe(false);
  });
});
