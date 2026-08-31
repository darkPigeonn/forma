"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ui } from "@/lib/ui-id";

function mapAuthError(code: string | undefined) {
  switch (code) {
    case "auth/invalid-email":
      return ui.authInvalidEmail;
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return ui.authWrongCredentials;
    case "auth/too-many-requests":
      return ui.authTooManyRequests;
    default:
      return ui.authSignInFailed;
  }
}

export function LoginForm({ redirectTo = "/dashboard" }: { redirectTo?: string }) {
  const router = useRouter();
  const emailId = useId();
  const passwordId = useId();
  const errorId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const auth = getClientAuth();
      const credential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        throw new Error("session");
      }
      router.replace(redirectTo);
      router.refresh();
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : undefined;
      setError(mapAuthError(code));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <GoogleSignInButton
        disabled={pending}
        redirectTo={redirectTo}
        onError={(message) => setError(message || null)}
      />

      <div className="flex items-center gap-3" role="separator" aria-label={ui.or}>
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {ui.or}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={emailId} className="text-sm font-medium text-ink">
            {ui.email}
          </label>
          <input
            id={emailId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-ink"
            placeholder={ui.yourEmail}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={passwordId} className="text-sm font-medium text-ink">
            {ui.password}
          </label>
          <input
            id={passwordId}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-ink"
            placeholder={ui.yourPassword}
          />
        </div>

        {error ? (
          <p id={errorId} role="alert" className="text-sm text-danger">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="min-h-11 rounded-md bg-accent px-4 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? ui.signingIn : ui.signInWithEmail}
        </button>

        <p className="text-sm text-ink-muted">
          {ui.newToSurvei}{" "}
          <Link
            href="/signup"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {ui.createAccount}
          </Link>
        </p>
      </form>
    </div>
  );
}
