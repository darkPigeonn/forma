import { ui } from "@/lib/ui-id";

export default function Loading() {
  return (
    <div
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-6 py-14"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">{ui.loadingForm}</span>
      <div className="h-8 w-56 animate-pulse rounded-md bg-border/80" />
      <div className="h-4 w-full animate-pulse rounded-md bg-border/50" />
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-md border border-border bg-bg-elevated" />
        <div className="h-20 animate-pulse rounded-md border border-border bg-bg-elevated" />
        <div className="h-20 animate-pulse rounded-md border border-border bg-bg-elevated" />
      </div>
    </div>
  );
}
