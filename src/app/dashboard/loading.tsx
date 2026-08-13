import { ui } from "@/lib/ui-id";

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{ui.loading}</span>
      <div className="h-8 w-48 animate-pulse rounded-md bg-border/80" />
      <div className="h-4 w-80 max-w-full animate-pulse rounded-md bg-border/60" />
      <div className="mt-6 h-40 animate-pulse rounded-md border border-border bg-bg-elevated" />
    </div>
  );
}
