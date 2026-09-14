import { useState } from "react";
import { Button } from "@/components/ui/button";

export function DeleteAccountSection() {
  const [confirmed, setConfirmed] = useState(false);

  if (!confirmed) {
    return (
      <section className="rounded-xl border border-red-400/20 bg-red-500/5 p-4">
        <h2 className="text-sm font-semibold text-red-200">Delete account</h2>
        <p className="mt-1 text-sm text-red-200/70">
          Permanently delete your account and all tasks. This cannot be undone.
        </p>
        <Button
          variant="destructive"
          size="sm"
          className="mt-3"
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
    <section className="rounded-xl border border-red-400/30 bg-red-500/10 p-4">
      <p className="text-sm text-red-100">Are you sure? All your tasks will be deleted.</p>
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
