import Link from "next/link";
import { getSessionUser } from "@/lib/firebase/auth";
import { ui } from "@/lib/ui-id";

export default async function HomePage() {
  const user = await getSessionUser();

  return (
    <main className="relative flex min-h-full flex-1 flex-col">
      <section
        className="landing-grain relative flex min-h-[100dvh] flex-1 flex-col overflow-hidden"
        aria-label={ui.brand}
      >
        {/* Full-bleed form canvas visual */}
        <div
          className="pointer-events-none absolute inset-0 motion-fade-in"
          aria-hidden="true"
        >
          <div className="absolute inset-y-0 right-[-8%] hidden w-[58%] items-center lg:flex">
            <div className="landing-form-sheet relative h-[78%] w-full max-w-xl rotate-2 rounded-sm p-10 xl:max-w-2xl">
              <div className="mb-8 h-3 w-40 rounded-sm bg-ink/90" />
              <div className="mb-10 h-2 w-64 rounded-sm bg-ink/25" />
              <div className="space-y-8">
                <div className="space-y-3">
                  <div className="h-2 w-28 rounded-sm bg-ink/40" />
                  <div className="h-10 w-full rounded-md border border-border bg-bg" />
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-36 rounded-sm bg-ink/40" />
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="size-4 rounded-full border border-ink/30" />
                      <div className="h-2 w-32 rounded-sm bg-ink/20" />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="size-4 rounded-full border border-accent bg-accent/20" />
                      <div className="h-2 w-40 rounded-sm bg-ink/20" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="h-2 w-24 rounded-sm bg-ink/40" />
                  <div className="h-24 w-full rounded-md border border-border bg-bg" />
                </div>
              </div>
              <div className="absolute bottom-10 left-10 h-10 w-28 rounded-md bg-accent/90" />
            </div>
          </div>
          {/* Mobile / tablet edge wash suggesting the sheet */}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-bg via-bg/80 to-transparent lg:hidden" />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 py-16 sm:px-10 lg:py-20">
          <div className="max-w-xl space-y-8">
            <p className="motion-fade-up font-[family-name:var(--font-fraunces)] text-5xl font-semibold tracking-tight text-ink sm:text-6xl lg:text-7xl">
              {ui.brand}
            </p>
            <div className="motion-fade-up-delay space-y-4">
              <h1 className="text-2xl font-medium leading-snug text-ink sm:text-3xl">
                {ui.landingHeadline}
              </h1>
              <p className="max-w-md text-lg text-ink-muted">{ui.landingSub}</p>
            </div>

            <div className="motion-fade-up-delay flex flex-wrap gap-3">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center rounded-md bg-accent px-6 font-medium text-white transition hover:bg-accent-hover"
                >
                  {ui.goToDashboard}
                </Link>
              ) : (
                <>
                  <Link
                    href="/signup"
                    className="inline-flex min-h-11 items-center rounded-md bg-accent px-6 font-medium text-white transition hover:bg-accent-hover"
                  >
                    {ui.getStarted}
                  </Link>
                  <Link
                    href="/login"
                    className="inline-flex min-h-11 items-center rounded-md border border-border bg-bg-elevated/90 px-6 font-medium text-ink backdrop-blur-sm transition hover:border-ink-muted"
                  >
                    {ui.signIn}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
