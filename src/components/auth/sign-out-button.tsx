"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { ui } from "@/lib/ui-id";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSignOut() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      try {
        await signOut(getClientAuth());
      } catch {
        // Client Firebase may be unconfigured in some envs; cookie clear is enough.
      }
      router.replace("/login");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onSignOut}
      disabled={pending}
      className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-sm font-medium text-ink transition hover:border-ink-muted disabled:opacity-60"
    >
      {pending ? ui.signingOut : ui.signOut}
    </button>
  );
}
