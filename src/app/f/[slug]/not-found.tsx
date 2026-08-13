import Link from "next/link";
import { ui } from "@/lib/ui-id";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-6 py-16">
      <p className="font-[family-name:var(--font-fraunces)] text-3xl font-semibold">
        {ui.formNotFound}
      </p>
      <p className="text-ink-muted">{ui.formNotFoundHint}</p>
      <Link href="/" className="font-medium text-accent hover:underline">
        {ui.backToForma}
      </Link>
    </main>
  );
}
