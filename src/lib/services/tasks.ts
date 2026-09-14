import type { SupabaseClient } from "@supabase/supabase-js";
import { FOCUS_LIMIT, type FocusLimitResult } from "@/types";

const FOCUS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function validateFocusDate(localDate: string): { ok: true; date: string } | { ok: false; reason: string } {
  if (!FOCUS_DATE_PATTERN.test(localDate)) {
    return { ok: false, reason: "invalid_focus_date_format" };
  }

  const [year, month, day] = localDate.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) {
    return { ok: false, reason: "invalid_focus_date" };
  }

  const minDate = formatUtcDate(addUtcDays(new Date(), -1));
  const maxDate = formatUtcDate(addUtcDays(new Date(), 1));

  if (localDate < minDate || localDate > maxDate) {
    return { ok: false, reason: "invalid_focus_date" };
  }

  return { ok: true, date: localDate };
}

export async function countFocusSlots(supabase: SupabaseClient, focusDate: string): Promise<number> {
  const { count, error } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("focus_date", focusDate);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function checkFocusLimit(supabase: SupabaseClient, focusDate: string): Promise<FocusLimitResult> {
  const validation = validateFocusDate(focusDate);

  if (!validation.ok) {
    return {
      allowed: false,
      currentCount: 0,
      limit: FOCUS_LIMIT,
      reason: "invalid_focus_date",
    };
  }

  const currentCount = await countFocusSlots(supabase, validation.date);

  if (currentCount >= FOCUS_LIMIT) {
    return {
      allowed: false,
      currentCount,
      limit: FOCUS_LIMIT,
      reason: "focus_limit_exceeded",
    };
  }

  return {
    allowed: true,
    currentCount,
    limit: FOCUS_LIMIT,
  };
}

function mentionsFocusLimitExceeded(value: string): boolean {
  return value.includes("focus_limit_exceeded");
}

export function isFocusLimitDbError(error: unknown): boolean {
  if (typeof error === "string") {
    return mentionsFocusLimitExceeded(error);
  }

  if (error instanceof Error) {
    return mentionsFocusLimitExceeded(error.message);
  }

  if (error && typeof error === "object") {
    const err = error as { code?: string; message?: string; details?: string | null };

    if (err.code === "P0001" && typeof err.message === "string" && mentionsFocusLimitExceeded(err.message)) {
      return true;
    }

    if (typeof err.message === "string" && mentionsFocusLimitExceeded(err.message)) {
      return true;
    }

    if (typeof err.details === "string" && mentionsFocusLimitExceeded(err.details)) {
      return true;
    }
  }

  return false;
}
