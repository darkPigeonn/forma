import Link from "next/link";
import { ui } from "@/lib/ui-id";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">
        {ui.pageNotFound}
      </h1>
      <p className="text-ink-muted">{ui.pageNotFoundHint}</p>
      <Link
        href="/"
        className="w-fit font-medium text-accent hover:underline"
      >
        {ui.backToSurvei}
      </Link>
    </main>
  );
}
