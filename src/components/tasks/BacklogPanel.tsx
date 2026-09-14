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
      <h2 className="font-serif text-xl font-semibold">Backlog</h2>
      <p className="text-muted-foreground text-sm">Waiting. Not today, unless you move one in.</p>

      {tasks.length === 0 ? (
        <p className="text-muted-foreground text-sm">Backlog is empty.</p>
      ) : (
        <ul className="divide-border border-border divide-y divide-dashed border-y border-dashed">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center gap-2 py-3">
              <span className="text-foreground min-w-0 flex-1 text-sm">{task.title}</span>
              <Button size="sm" variant="secondary" onClick={() => onAddToFocus(task)}>
                Add to focus
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => onDelete(task.id)}>
                Delete
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
