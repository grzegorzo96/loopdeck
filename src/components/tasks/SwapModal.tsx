import { useState } from "react";
import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SwapModalProps {
  pendingTask: Task;
  focusTasks: Task[];
  onConfirm: (swapOutId: string) => Promise<void>;
  onCancel: () => void;
}

export function SwapModal({ pendingTask, focusTasks, onConfirm, onCancel }: SwapModalProps) {
  const [swapOutId, setSwapOutId] = useState(focusTasks[0]?.id ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    if (!swapOutId || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm(swapOutId);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 text-white shadow-xl"
        role="dialog"
        aria-labelledby="swap-title"
      >
        <h2 id="swap-title" className="text-lg font-semibold">
          Three for today is the whole day
        </h2>
        <p className="mt-2 text-sm text-white/70">
          Swap one out to add <span className="font-medium text-white">{pendingTask.title}</span>.
        </p>

        <ul className="mt-4 space-y-2">
          {focusTasks.map((task) => (
            <li key={task.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm",
                  swapOutId === task.id ? "border-blue-400/60 bg-blue-500/10" : "border-white/10",
                )}
              >
                <input
                  type="radio"
                  name="swapOut"
                  value={task.id}
                  checked={swapOutId === task.id}
                  onChange={() => {
                    setSwapOutId(task.id);
                  }}
                  className="accent-blue-400"
                />
                <span className={task.completed_at ? "text-white/50 line-through" : ""}>{task.title}</span>
              </label>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!swapOutId || submitting}>
            Swap
          </Button>
        </div>
      </div>
    </div>
  );
}
