"use client";

import { useId, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import {
  establishSession,
  getEmailVerificationContinueUrl,
} from "@/lib/firebase/session-client";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { ui } from "@/lib/ui-id";

function mapAuthError(code: string | undefined) {
  switch (code) {
    case "auth/email-already-in-use":
      return ui.authEmailInUse;
    case "auth/invalid-email":
      return ui.authInvalidEmail;
    case "auth/weak-password":
      return ui.authWeakPassword;
    default:
      return ui.authCreateAccountFailed;
  }
}

export function SignUpForm() {
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
      const credential = await createUserWithEmailAndPassword(
        auth,
        email.trim(),
        password,
      );
      await sendEmailVerification(credential.user, {
        url: getEmailVerificationContinueUrl(),
      });
      const idToken = await credential.user.getIdToken();
      const nextPath = await establishSession(idToken);
      router.replace(nextPath);
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
        label={ui.signUpWithGoogle}
        disabled={pending}
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
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
            className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-ink"
            placeholder={ui.atLeast6Chars}
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
          {pending ? ui.creatingAccount : ui.createWithEmail}
        </button>

        <p className="text-sm text-ink-muted">
          {ui.alreadyHaveAccount}{" "}
          <Link
            href="/login"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            {ui.signIn}
          </Link>
        </p>
      </form>
    </div>
  );
}
