"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { sendEmailVerification } from "firebase/auth";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getClientAuth } from "@/lib/firebase/client";
import {
  establishSession,
  getEmailVerificationContinueUrl,
} from "@/lib/firebase/session-client";
import { ui } from "@/lib/ui-id";

type VerifyEmailPanelProps = {
  email: string;
};

export function VerifyEmailPanel({ email }: VerifyEmailPanelProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState(false);
  const [checkPending, setCheckPending] = useState(false);

  async function resend() {
    setNotice(null);
    setError(null);
    setResendPending(true);

    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }
      await sendEmailVerification(user, {
        url: getEmailVerificationContinueUrl(),
      });
      setNotice(ui.verifyEmailResent);
    } catch (err) {
      const code =
        err && typeof err === "object" && "code" in err
          ? String((err as { code: string }).code)
          : undefined;
      setError(
        code === "auth/too-many-requests"
          ? ui.authTooManyRequests
          : ui.verifyEmailResendFailed,
      );
    } finally {
      setResendPending(false);
    }
  }

  async function checkVerified() {
    setNotice(null);
    setError(null);
    setCheckPending(true);

    try {
      const auth = getClientAuth();
      const user = auth.currentUser;
      if (!user) {
        router.replace("/login");
        return;
      }

      await user.reload();
      if (!user.emailVerified) {
        setError(ui.verifyEmailStillPending);
        return;
      }

      const idToken = await user.getIdToken(true);
      const nextPath = await establishSession(idToken);
      router.replace(nextPath);
      router.refresh();
    } catch {
      setError(ui.verifyEmailStillPending);
    } finally {
      setCheckPending(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <p className="text-sm text-ink-muted">{ui.verifyEmailHint}</p>
      <p className="text-sm font-medium text-ink">{ui.verifyEmailSentTo(email)}</p>

      {notice ? (
        <p role="status" className="text-sm text-accent">
          {notice}
        </p>
      ) : null}

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={() => void checkVerified()}
        disabled={checkPending || resendPending}
        className="min-h-11 rounded-md bg-accent px-4 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {checkPending ? ui.verifyEmailChecking : ui.verifyEmailCheck}
      </button>

      <button
        type="button"
        onClick={() => void resend()}
        disabled={resendPending || checkPending}
        className="min-h-11 rounded-md border border-border bg-bg-elevated px-4 font-medium text-ink transition hover:border-ink-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {resendPending ? ui.verifyEmailResending : ui.verifyEmailResend}
      </button>

      <p className="text-sm text-ink-muted">
        <SignOutButton
          label={ui.verifyEmailUseOtherAccount}
          variant="link"
        />
      </p>
    </div>
  );
}
