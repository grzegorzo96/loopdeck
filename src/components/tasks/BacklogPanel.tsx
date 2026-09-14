import type { Task } from "@/types";
import { Button } from "@/components/ui/button";

interface BacklogPanelProps {
  tasks: Task[];
  onAddToFocus: (task: Task) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export function BacklogPanel({ tasks, onAddToFocus, onDelete }: BacklogPanelProps) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold tracking-wide text-white/60 uppercase">Backlog</h2>

      {tasks.length === 0 ? (
        <p className="text-sm text-white/50">Backlog is empty.</p>
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm text-white">{task.title}</span>
              <Button size="sm" variant="secondary" onClick={() => onAddToFocus(task)}>
                Add to focus
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
