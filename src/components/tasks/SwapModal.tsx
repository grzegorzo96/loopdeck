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
    <div className="bg-foreground/40 fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="bg-card text-card-foreground border-border w-full max-w-md rounded-sm border p-6 shadow-lg"
        role="dialog"
        aria-labelledby="swap-title"
      >
        <h2 id="swap-title" className="font-serif text-2xl font-semibold">
          Three for today is the whole day
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Swap one out to add <span className="text-foreground font-medium">{pendingTask.title}</span>.
        </p>

        <ul className="mt-4 space-y-2">
          {focusTasks.map((task) => (
            <li key={task.id}>
              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm",
                  swapOutId === task.id ? "border-primary bg-primary/5" : "border-border",
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
                  className="accent-primary"
                />
                <span className={task.completed_at ? "text-muted-foreground line-through" : ""}>{task.title}</span>
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
