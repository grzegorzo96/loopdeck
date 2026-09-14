import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/api/require-auth";
import { taskErrorResponse } from "@/lib/api/task-errors";
import { patchTaskSchema } from "@/lib/schemas/tasks";
import { completeTask, deleteTask, setTaskFocus, unsetTaskFocus } from "@/lib/services/task-queries";
import { recordFocusDaySetIfNew, recordTaskCompleted } from "@/lib/services/product-events";

export const prerender = false;

function getTaskId(context: Parameters<APIRoute>[0]): string | null {
  return context.params.id ?? null;
}

export const PATCH: APIRoute = async (context) => {
  const auth = await requireAuth(context);
  if (auth.error) return auth.error;

  const taskId = getTaskId(context);
  if (!taskId) {
    return jsonResponse({ code: "validation_error", message: "Missing task id" }, 400);
  }

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ code: "invalid_json", message: "Invalid JSON body" }, 400);
  }

  const parsed = patchTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ code: "validation_error", message: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  try {
    let task;
    if (parsed.data.action === "setFocus") {
      task = await setTaskFocus(auth.supabase, taskId, parsed.data.localDate);
      await recordFocusDaySetIfNew(auth.supabase, auth.user.id, parsed.data.localDate);
    } else if (parsed.data.action === "unsetFocus") {
      task = await unsetTaskFocus(auth.supabase, taskId);
    } else {
      const completed = await completeTask(auth.supabase, taskId, parsed.data.localDate);
      task = completed.task;
      if (completed.newlyCompleted) {
        await recordTaskCompleted(auth.supabase, auth.user.id, task.id, parsed.data.localDate);
      }
    }
    return jsonResponse({ task });
  } catch (error) {
    if (error instanceof Error) {
      const known = ["focus_limit_exceeded", "invalid_focus_date", "complete_requires_focus", "not_found"];
      if (known.includes(error.message)) {
        return taskErrorResponse(error.message);
      }
    }
    throw error;
  }
};

export const DELETE: APIRoute = async (context) => {
  const auth = await requireAuth(context);
  if (auth.error) return auth.error;

  const taskId = getTaskId(context);
  if (!taskId) {
    return jsonResponse({ code: "validation_error", message: "Missing task id" }, 400);
  }

  try {
    await deleteTask(auth.supabase, taskId);
    return new Response(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && error.message === "not_found") {
      return taskErrorResponse("not_found");
    }
    throw error;
  }
};
