import { useState } from "react";
import type { Task } from "@/types";
import { useTasks, isTaskApiError } from "@/components/hooks/useTasks";
import { TaskAddForm } from "@/components/tasks/TaskAddForm";
import { FocusPanel } from "@/components/tasks/FocusPanel";
import { BacklogPanel } from "@/components/tasks/BacklogPanel";
import { EmptyState } from "@/components/tasks/EmptyState";
import { SwapModal } from "@/components/tasks/SwapModal";

export function TaskApp() {
  const { focus, backlog, loading, error, createTask, patchTask, deleteTaskById, swapFocus } = useTasks();
  const [actionError, setActionError] = useState<string | null>(null);
  const [swapPending, setSwapPending] = useState<Task | null>(null);

  const isEmpty = !loading && focus.length === 0 && backlog.length === 0;

  async function handleCreate(title: string) {
    setActionError(null);
    try {
      await createTask(title, true);
    } catch (err) {
      if (isTaskApiError(err) && err.code === "focus_limit_exceeded") {
        setActionError("Three for today is the whole day. Unset one or swap from backlog.");
      } else {
        setActionError(err instanceof Error ? err.message : "Could not add task");
      }
      throw err;
    }
  }

  async function handleAddToFocus(task: Task) {
    setActionError(null);
    try {
      await patchTask(task.id, "setFocus");
    } catch (err) {
      if (isTaskApiError(err) && err.code === "focus_limit_exceeded") {
        setSwapPending(task);
        return;
      }
      setActionError(err instanceof Error ? err.message : "Could not set focus");
    }
  }

  async function handleDelete(taskId: string) {
    if (!window.confirm("Delete this task?")) return;
    setActionError(null);
    try {
      await deleteTaskById(taskId);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete task");
    }
  }

  async function handleSwapConfirm(swapOutId: string) {
    if (!swapPending) return;
    setActionError(null);
    try {
      await swapFocus(swapPending.id, swapOutId);
      setSwapPending(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Swap failed");
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-8 p-4">
      {isEmpty && <EmptyState />}

      <TaskAddForm onSubmit={handleCreate} disabled={loading} />

      {(error ?? actionError) && (
        <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error ?? actionError}
        </p>
      )}

      <FocusPanel
        tasks={focus}
        onUnset={async (id) => {
          await patchTask(id, "unsetFocus");
        }}
        onComplete={async (id) => {
          await patchTask(id, "complete");
        }}
        onDelete={handleDelete}
      />

      <BacklogPanel tasks={backlog} onAddToFocus={handleAddToFocus} onDelete={handleDelete} />

      {swapPending && (
        <SwapModal
          pendingTask={swapPending}
          focusTasks={focus}
          onConfirm={handleSwapConfirm}
          onCancel={() => {
            setSwapPending(null);
          }}
        />
      )}
    </div>
  );
}
