import type { Task } from "@/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FocusPanelProps {
  tasks: Task[];
  onUnset: (taskId: string) => Promise<void>;
  onComplete: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

const SLOT_COUNT = 3;

export function FocusPanel({ tasks, onUnset, onComplete, onDelete }: FocusPanelProps) {
  const doneCount = tasks.filter((task) => task.completed_at).length;
  const emptySlots = Math.max(0, SLOT_COUNT - tasks.length);

  return (
    <section className="bg-card border-border rounded-sm border px-4 py-5 sm:px-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-serif text-xl font-semibold">Today&apos;s focus</h2>
        {tasks.length > 0 && (
          <span className="text-muted-foreground text-sm">
            {doneCount} of {tasks.length} done
          </span>
        )}
      </div>

      {tasks.length === 0 ? <p className="text-muted-foreground mt-4 text-sm">No tasks in focus yet.</p> : null}

      <ul className="mt-4 space-y-0">
        {tasks.map((task, index) => (
          <li
            key={task.id}
            className="border-border flex items-center gap-2 border-b border-dashed py-3 first:border-t"
          >
            <span className="text-muted-foreground w-5 shrink-0 font-serif">{index + 1}</span>
            <span
              className={cn(
                "min-w-0 flex-1 text-sm",
                task.completed_at ? "text-muted-foreground line-through" : "text-foreground",
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
              Later
            </Button>
            <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDelete(task.id)}>
              Delete
            </Button>
          </li>
        ))}
      </ul>

      {emptySlots > 0 && (
        <div className="space-y-0" aria-hidden="true">
          {Array.from({ length: emptySlots }, (_, index) => {
            const number = tasks.length + index + 1;
            return (
              <div
                key={number}
                className={cn(
                  "border-border flex items-end gap-3 border-b border-dashed py-3",
                  tasks.length === 0 && index === 0 && "border-t",
                )}
              >
                <span className="text-muted-foreground/70 w-5 font-serif">{number}</span>
                <span className="border-border mb-1 h-px flex-1 border-b border-dashed" />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
