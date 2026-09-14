import { useCallback, useEffect, useState } from "react";
import type { Task } from "@/types";

export interface TaskLists {
  focus: Task[];
  backlog: Task[];
}

function getLocalDate(): string {
  return new Date().toLocaleDateString("en-CA");
}

async function parseJson<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { code?: string; message?: string };
  if (!response.ok) {
    throw Object.assign(new Error(data.message ?? "Request failed"), {
      code: data.code,
      status: response.status,
    });
  }
  return data;
}

export function useTasks() {
  const [localDate, setLocalDate] = useState(getLocalDate);
  const [focus, setFocus] = useState<Task[]>([]);
  const [backlog, setBacklog] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyLists = useCallback((data: TaskLists) => {
    setFocus(data.focus);
    setBacklog(data.backlog);
  }, []);

  const refresh = useCallback(
    async (date = localDate) => {
      setLoading(true);
      setError(null);
      try {
        const data = await parseJson<TaskLists>(await fetch(`/api/tasks?localDate=${encodeURIComponent(date)}`));
        applyLists(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load tasks");
      } finally {
        setLoading(false);
      }
    },
    [applyLists, localDate],
  );

  useEffect(() => {
    let cancelled = false;

    // Load tasks when localDate changes (lazy day reset).
    async function loadTasks() {
      setLoading(true);
      setError(null);
      try {
        const data = await parseJson<TaskLists>(await fetch(`/api/tasks?localDate=${encodeURIComponent(localDate)}`));
        if (!cancelled) {
          applyLists(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load tasks");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadTasks();
    return () => {
      cancelled = true;
    };
  }, [localDate, applyLists]);

  useEffect(() => {
    const syncDate = () => {
      if (document.visibilityState !== "visible") return;
      const next = getLocalDate();
      setLocalDate((current) => (current === next ? current : next));
    };

    const interval = window.setInterval(syncDate, 60_000);
    document.addEventListener("visibilitychange", syncDate);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", syncDate);
    };
  }, []);

  const createTask = useCallback(
    async (title: string, setFocusFlag: boolean) => {
      const data = await parseJson<{ task: Task }>(
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, setFocus: setFocusFlag, localDate }),
        }),
      );
      await refresh();
      return data.task;
    },
    [localDate, refresh],
  );

  const patchTask = useCallback(
    async (taskId: string, action: "setFocus" | "unsetFocus" | "complete") => {
      const data = await parseJson<{ task: Task }>(
        await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, localDate }),
        }),
      );
      await refresh();
      return data.task;
    },
    [localDate, refresh],
  );

  const deleteTaskById = useCallback(
    async (taskId: string) => {
      const response = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
      if (!response.ok) {
        await parseJson(response);
      }
      await refresh();
    },
    [refresh],
  );

  const swapFocus = useCallback(
    async (taskId: string, swapOutId: string) => {
      const data = await parseJson<TaskLists>(
        await fetch("/api/tasks/focus/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId, swapOutId, localDate }),
        }),
      );
      applyLists(data);
    },
    [applyLists, localDate],
  );

  return {
    localDate,
    focus,
    backlog,
    loading,
    error,
    refresh,
    createTask,
    patchTask,
    deleteTaskById,
    swapFocus,
  };
}

export type TaskApiError = Error & { code?: string; status?: number };

export function isTaskApiError(err: unknown): err is TaskApiError {
  return err instanceof Error && "code" in err;
}
