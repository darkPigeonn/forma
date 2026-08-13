import { ui } from "@/lib/ui-id";

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-6 py-16"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{ui.loadingForm}</span>
      <div className="h-4 w-32 animate-pulse rounded-md bg-border/60" />
      <div className="h-9 w-64 animate-pulse rounded-md bg-border/80" />
      <div className="mt-4 h-10 w-full max-w-md animate-pulse rounded-md bg-border/50" />
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-md border border-border bg-bg-elevated" />
        <div className="hidden h-64 animate-pulse rounded-md border border-border bg-bg-elevated lg:block" />
      </div>
    </div>
  );
}
