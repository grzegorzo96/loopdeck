import { jsonResponse } from "@/lib/api/json";

const ERROR_MAP: Record<string, { status: number; code: string; message: string }> = {
  focus_limit_exceeded: {
    status: 409,
    code: "focus_limit_exceeded",
    message: "Three for today is the whole day.",
  },
  invalid_focus_date: {
    status: 400,
    code: "invalid_focus_date",
    message: "Invalid local date.",
  },
  complete_requires_focus: {
    status: 422,
    code: "complete_requires_focus",
    message: "Complete a task only from today's focus.",
  },
  not_found: {
    status: 404,
    code: "not_found",
    message: "Task not found.",
  },
  already_in_focus: {
    status: 409,
    code: "already_in_focus",
    message: "Task is already in focus.",
  },
  swap_out_not_in_focus: {
    status: 409,
    code: "swap_out_not_in_focus",
    message: "Swap target is not in today's focus.",
  },
};

export function taskErrorResponse(reason: string): Response {
  const mapped = ERROR_MAP[reason] ?? {
    status: 500,
    code: "internal_error",
    message: "Something went wrong.",
  };

  return jsonResponse({ code: mapped.code, message: mapped.message }, mapped.status);
}
