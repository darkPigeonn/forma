"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ui } from "@/lib/ui-id";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">
        {ui.somethingWrong}
      </h1>
      <p className="text-ink-muted">{ui.somethingWrongHint}</p>
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
          className="inline-flex min-h-11 items-center rounded-md border border-border px-4 font-medium hover:border-ink-muted"
        >
          {ui.home}
        </Link>
      </div>
    </main>
  );
}
