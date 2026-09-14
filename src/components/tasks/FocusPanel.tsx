import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusPanelProps {
  tasks: Task[];
  onUnset: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function FocusPanel({ tasks, onUnset, onComplete, onDelete }: FocusPanelProps) {
  const doneCount = tasks.filter((task) => task.completed_at).length;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-white/60 uppercase">Today&apos;s focus</h2>
        {tasks.length > 0 && (
          <span className="text-xs text-white/50">
            {doneCount} of {tasks.length} done
          </span>
        )}
      </div>

      {tasks.length === 0 ? (
        <p className="text-sm text-white/50">No tasks in focus yet.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span
                className={cn(
                  "min-w-0 flex-1 text-sm",
                  task.completed_at ? "text-white/50 line-through" : "text-white",
                )}
              >
                {task.title}
              </span>
              {!task.completed_at && (
                <Button size="sm" variant="secondary" onClick={() => onComplete(task.id)}>
                  Done
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={() => onUnset(task.id)}>
                Unset
              </Button>
              <Button size="sm" variant="destructive" onClick={() => onDelete(task.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
