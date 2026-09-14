import type { APIRoute } from "astro";
import { jsonResponse } from "@/lib/api/json";
import { requireAuth } from "@/lib/api/require-auth";
import { taskErrorResponse } from "@/lib/api/task-errors";
import { createTaskSchema, listTasksQuerySchema } from "@/lib/schemas/tasks";
import { createTask, listTasks } from "@/lib/services/task-queries";
import { recordFirstTaskAddedIfNew, recordFocusDaySetIfNew } from "@/lib/services/product-events";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const auth = await requireAuth(context);
  if (auth.error) return auth.error;

  const query = listTasksQuerySchema.safeParse({
    localDate: context.url.searchParams.get("localDate"),
  });

  if (!query.success) {
    return jsonResponse({ code: "validation_error", message: query.error.issues[0]?.message ?? "Invalid query" }, 400);
  }

  try {
    const lists = await listTasks(auth.supabase, query.data.localDate);
    return jsonResponse(lists);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_focus_date") {
      return taskErrorResponse("invalid_focus_date");
    }
    throw error;
  }
};

export const POST: APIRoute = async (context) => {
  const auth = await requireAuth(context);
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return jsonResponse({ code: "invalid_json", message: "Invalid JSON body" }, 400);
  }

  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse({ code: "validation_error", message: parsed.error.issues[0]?.message ?? "Invalid body" }, 400);
  }

  try {
    const task = await createTask(auth.supabase, {
      title: parsed.data.title,
      userId: auth.user.id,
      setFocus: parsed.data.setFocus,
      localDate: parsed.data.localDate,
    });

    await recordFirstTaskAddedIfNew(auth.supabase, auth.user.id, task.id);
    if (parsed.data.setFocus) {
      await recordFocusDaySetIfNew(auth.supabase, auth.user.id, parsed.data.localDate);
    }

    return jsonResponse({ task }, 201);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message in { focus_limit_exceeded: 1, invalid_focus_date: 1 }) {
        return taskErrorResponse(error.message);
      }
    }
    throw error;
  }
};
