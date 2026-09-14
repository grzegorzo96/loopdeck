import { useState, type SubmitEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskAddFormProps {
  onSubmit: (title: string) => Promise<void>;
  disabled?: boolean;
  className?: string;
}

export function TaskAddForm({ onSubmit, disabled, className }: TaskAddFormProps) {
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setTitle("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex gap-2", className)}>
      <input
        type="text"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
        aria-label="New task"
        placeholder="What needs doing?"
        maxLength={500}
        disabled={Boolean(disabled) || submitting}
        className="border-input bg-card text-foreground placeholder:text-muted-foreground focus:border-ring focus:ring-ring/30 min-w-0 flex-1 rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
      />
      <Button type="submit" disabled={(disabled ?? false) || submitting || !title.trim()}>
        Add to focus
      </Button>
    </form>
  );
}
