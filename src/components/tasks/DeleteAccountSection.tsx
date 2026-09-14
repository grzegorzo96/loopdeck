import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <section className="border-border border-t pt-8">
        <h2 className="text-muted-foreground text-sm font-medium">Account</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Permanently delete your account and all tasks. This cannot be undone.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive mt-3"
          onClick={() => {
            setConfirmed(true);
          }}
        >
          Delete my account
        </Button>
      </section>
    );
  }

  return (
    <section className="border-destructive/30 bg-destructive/5 rounded-sm border p-4">
      <p className="text-foreground text-sm">Are you sure? All your tasks will be deleted.</p>
      <form method="POST" action="/api/auth/delete-account" className="mt-3 flex gap-2">
        <Button type="submit" variant="destructive" size="sm">
          Yes, delete everything
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setConfirmed(false);
          }}
        >
          Cancel
        </Button>
      </form>
    </section>
  );
}
