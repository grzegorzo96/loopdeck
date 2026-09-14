import type { SupabaseClient } from "@supabase/supabase-js";

export type ProductEventType = "account_created" | "first_task_added" | "focus_day_set" | "task_completed";

interface RecordEventInput {
  userId: string;
  eventType: ProductEventType;
  metadata?: Record<string, string>;
}

export async function recordEvent(supabase: SupabaseClient, input: RecordEventInput): Promise<void> {
  const { error } = await supabase.from("product_events").insert({
    user_id: input.userId,
    event_type: input.eventType,
    metadata: input.metadata ?? {},
  });

  if (error && error.code !== "23505") {
    // eslint-disable-next-line no-console -- plan requires logging failed event inserts without failing user ops
    console.error("Failed to record product event:", input.eventType, error.message);
  }
}

export async function recordFirstTaskAddedIfNew(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
): Promise<void> {
  await recordEvent(supabase, {
    userId,
    eventType: "first_task_added",
    metadata: { task_id: taskId },
  });
}

export async function recordFocusDaySetIfNew(
  supabase: SupabaseClient,
  userId: string,
  localDate: string,
): Promise<void> {
  await recordEvent(supabase, {
    userId,
    eventType: "focus_day_set",
    metadata: { focus_date: localDate },
  });
}

export async function recordTaskCompleted(
  supabase: SupabaseClient,
  userId: string,
  taskId: string,
  focusDate: string,
): Promise<void> {
  await recordEvent(supabase, {
    userId,
    eventType: "task_completed",
    metadata: { task_id: taskId, focus_date: focusDate },
  });
}
