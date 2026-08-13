"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-id";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-fraunces)] text-2xl font-semibold">
        {ui.couldNotLoadDashboard}
      </h1>
      <p className="text-ink-muted">{ui.checkConnection}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-medium text-white hover:bg-accent-hover"
        >
          {ui.tryAgain}
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium"
        >
          {ui.home}
        </Link>
      </div>
    </div>
  );
}
