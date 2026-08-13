import Link from "next/link";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { ui } from "@/lib/ui-id";

type AppShellProps = {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
};

export function AppShell({ userName, userEmail, children }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b border-border bg-bg-elevated/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link
              href="/dashboard"
              className="font-[family-name:var(--font-fraunces)] text-xl font-semibold text-ink"
            >
              {ui.brand}
            </Link>
            <nav aria-label={ui.mainNav}>
              <Link
                href="/dashboard"
                className="text-sm font-medium text-ink-muted hover:text-ink"
              >
                {ui.forms}
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <p
              className="hidden truncate text-sm text-ink-muted sm:block"
              title={userEmail}
            >
              {userName}
            </p>
            <SignOutButton />
          </div>
        </div>
      </header>
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</div>
    </div>
  );
}
