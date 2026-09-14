import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/api/require-auth";
import { taskErrorResponse } from "@/lib/api/task-errors";
import { swapFocusSchema } from "@/lib/schemas/tasks";
import { swapTaskFocus } from "@/lib/services/task-queries";
import { recordFocusDaySetIfNew } from "@/lib/services/product-events";

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const auth = await requireAuth(context);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ code: "invalid_json", message: "Invalid JSON body" }, 400);
  }

  const parsed = swapFocusSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ code: "validation_error", message: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  try {
    const lists = await swapTaskFocus(auth.supabase, parsed.data);
    await recordFocusDaySetIfNew(auth.supabase, auth.user.id, parsed.data.localDate);
    return jsonResponse(lists);
  } catch (error) {
    if (error instanceof Error) {
      const known = [
        "focus_limit_exceeded",
        "invalid_focus_date",
        "not_found",
        "already_in_focus",
        "swap_out_not_in_focus",
      ];
      if (known.includes(error.message)) {
        return taskErrorResponse(error.message);
      }
    }
    throw error;
  }
};
