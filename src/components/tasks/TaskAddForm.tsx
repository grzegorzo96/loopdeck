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
        placeholder="What needs doing?"
        maxLength={500}
        disabled={Boolean(disabled) || submitting}
        className="min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none"
      />
      <Button type="submit" disabled={(disabled ?? false) || submitting || !title.trim()}>
        Add to focus
      </Button>
    </form>
  );
}
