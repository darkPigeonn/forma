"use client";

import { useEffect, useRef, useState } from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signOut,
  type User,
} from "firebase/auth";
import { getClientAuth } from "@/lib/firebase/client";
import {
  getGoogleOneTapClientId,
  loadGoogleIdentityServices,
} from "@/lib/google-identity-services";
import type { RespondentAuthState } from "@/components/form-fill/respondent-email-auth";
import { verifyRespondentAccess } from "@/lib/respondent-email-client";

export function useRespondentBrowserEmail(
  formSlug: string,
  enabled: boolean,
) {
  const [respondentAuth, setRespondentAuth] =
    useState<RespondentAuthState | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [detecting, setDetecting] = useState(enabled);
  const oneTapStarted = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setDetecting(false);
      return;
    }

    const auth = getClientAuth();
    let cancelled = false;

    async function adoptUser(user: User) {
      if (!user.email || cancelled) return;

      try {
        const idToken = await user.getIdToken();
        const result = await verifyRespondentAccess(formSlug, idToken);
        if (cancelled) return;

        if (!result.ok) {
          return;
        }

        if (result.alreadySubmitted) {
          setAlreadySubmitted(true);
          return;
        }

        setRespondentAuth({
          email: result.email,
          getIdToken: () => user.getIdToken(true),
        });
      } catch {
        // Email detection is best-effort — form remains fillable.
      }
    }

    async function tryGoogleOneTap() {
      if (oneTapStarted.current || auth.currentUser?.email) return;
      const clientId = getGoogleOneTapClientId();
      if (!clientId) return;

      oneTapStarted.current = true;

      try {
        await loadGoogleIdentityServices();
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: clientId,
          auto_select: true,
          cancel_on_tap_outside: true,
          itp_support: true,
          callback: (response: { credential: string }) => {
            void (async () => {
              try {
                const credential = GoogleAuthProvider.credential(
                  response.credential,
                );
                const result = await signInWithCredential(auth, credential);
                await adoptUser(result.user);
              } catch {
                // User dismissed or credential failed — continue anonymously.
              }
            })();
          },
        });

        window.google.accounts.id.prompt();
      } catch {
        // GSI unavailable — continue without email.
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      void (async () => {
        if (user?.email) {
          await adoptUser(user);
        } else {
          setRespondentAuth(null);
          await tryGoogleOneTap();
        }
        if (!cancelled) {
          setDetecting(false);
        }
      })();
    });

    return () => {
      cancelled = true;
      unsubscribe();
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        // ignore
      }
    };
  }, [enabled, formSlug]);

  async function clearRespondentEmail() {
    try {
      await signOut(getClientAuth());
    } catch {
      // ignore
    }
    setRespondentAuth(null);
  }

  return {
    respondentAuth,
    alreadySubmitted,
    detecting,
    clearRespondentEmail,
  };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
            itp_support?: boolean;
            callback: (response: { credential: string }) => void;
          }) => void;
          prompt: (momentListener?: (notification: unknown) => void) => void;
          cancel: () => void;
        };
      };
    };
  }
}
