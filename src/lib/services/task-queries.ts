import type { SupabaseClient } from "@supabase/supabase-js";
import type { Task } from "@/types";
import { checkFocusLimit, isFocusLimitDbError, validateFocusDate } from "@/lib/services/tasks";

export interface TaskLists {
  focus: Task[];
  backlog: Task[];
}

export async function listTasks(supabase: SupabaseClient, localDate: string): Promise<TaskLists> {
  const dateValidation = validateFocusDate(localDate);
  if (!dateValidation.ok) {
    throw new Error("invalid_focus_date");
  }

  const [focusResult, backlogResult] = await Promise.all([
    supabase.from("tasks").select("*").eq("focus_date", localDate).order("created_at", { ascending: true }),
    supabase
      .from("tasks")
      .select("*")
      .is("completed_at", null)
      .or(`focus_date.is.null,focus_date.lt.${localDate}`)
      .order("created_at", { ascending: false }),
  ]);

  if (focusResult.error) throw focusResult.error;
  if (backlogResult.error) throw backlogResult.error;

  return {
    focus: focusResult.data as Task[],
    backlog: backlogResult.data as Task[],
  };
}

export async function createTask(
  supabase: SupabaseClient,
  input: { title: string; userId: string; setFocus: boolean; localDate: string },
): Promise<Task> {
  const dateValidation = validateFocusDate(input.localDate);
  if (!dateValidation.ok) {
    throw new Error("invalid_focus_date");
  }

  if (input.setFocus) {
    const limit = await checkFocusLimit(supabase, input.localDate);
    if (!limit.allowed) {
      throw new Error(limit.reason);
    }
  }

  const result = await supabase
    .from("tasks")
    .insert({
      user_id: input.userId,
      title: input.title,
      focus_date: input.setFocus ? input.localDate : null,
    })
    .select("*")
    .single();

  if (result.error) {
    if (isFocusLimitDbError(result.error)) {
      throw new Error("focus_limit_exceeded");
    }
    throw result.error;
  }

  return result.data as Task;
}

export async function setTaskFocus(supabase: SupabaseClient, taskId: string, localDate: string): Promise<Task> {
  const dateValidation = validateFocusDate(localDate);
  if (!dateValidation.ok) {
    throw new Error("invalid_focus_date");
  }

  const limit = await checkFocusLimit(supabase, localDate);
  if (!limit.allowed) {
    throw new Error(limit.reason);
  }

  const result = await supabase
    .from("tasks")
    .update({ focus_date: localDate })
    .eq("id", taskId)
    .select("*")
    .maybeSingle();

  if (result.error) {
    if (isFocusLimitDbError(result.error)) {
      throw new Error("focus_limit_exceeded");
    }
    throw result.error;
  }

  if (!result.data) {
    throw new Error("not_found");
  }

  return result.data as Task;
}

export async function unsetTaskFocus(supabase: SupabaseClient, taskId: string): Promise<Task> {
  const result = await supabase.from("tasks").update({ focus_date: null }).eq("id", taskId).select("*").maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("not_found");

  return result.data as Task;
}

export async function completeTask(
  supabase: SupabaseClient,
  taskId: string,
  localDate: string,
): Promise<{ task: Task; newlyCompleted: boolean }> {
  const dateValidation = validateFocusDate(localDate);
  if (!dateValidation.ok) {
    throw new Error("invalid_focus_date");
  }

  const existingResult = await supabase.from("tasks").select("*").eq("id", taskId).single();

  if (existingResult.error || !existingResult.data) {
    throw new Error("not_found");
  }

  const task = existingResult.data as Task;

  if (task.focus_date !== localDate) {
    throw new Error("complete_requires_focus");
  }

  if (task.completed_at) {
    return { task, newlyCompleted: false };
  }

  const result = await supabase
    .from("tasks")
    .update({ completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .select("*")
    .single();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("not_found");

  return { task: result.data as Task, newlyCompleted: true };
}

export async function deleteTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  const result = await supabase.from("tasks").delete().eq("id", taskId).select("id").maybeSingle();

  if (result.error) throw result.error;
  if (!result.data) throw new Error("not_found");
}

export async function swapTaskFocus(
  supabase: SupabaseClient,
  input: { taskId: string; swapOutId: string; localDate: string },
): Promise<TaskLists> {
  const dateValidation = validateFocusDate(input.localDate);
  if (!dateValidation.ok) {
    throw new Error("invalid_focus_date");
  }

  const { data: rows, error: fetchError } = await supabase
    .from("tasks")
    .select("*")
    .in("id", [input.taskId, input.swapOutId]);

  if (fetchError) throw fetchError;

  const tasks = rows as Task[];
  const taskIn = tasks.find((t) => t.id === input.taskId);
  const taskOut = tasks.find((t) => t.id === input.swapOutId);

  if (!taskIn || !taskOut) {
    throw new Error("not_found");
  }

  if (taskIn.focus_date === input.localDate) {
    throw new Error("already_in_focus");
  }

  if (taskOut.focus_date !== input.localDate) {
    throw new Error("swap_out_not_in_focus");
  }

  const { error: unsetError } = await supabase.from("tasks").update({ focus_date: null }).eq("id", input.swapOutId);

  if (unsetError) throw unsetError;

  const { error: setError } = await supabase
    .from("tasks")
    .update({ focus_date: input.localDate })
    .eq("id", input.taskId);

  if (setError) {
    if (isFocusLimitDbError(setError)) {
      throw new Error("focus_limit_exceeded");
    }
    throw setError;
  }

  return listTasks(supabase, input.localDate);
}
