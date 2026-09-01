let loadPromise: Promise<void> | null = null;

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("gsi-load-failed"));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export function getGoogleOneTapClientId(): string | null {
  const configured = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  return configured || null;
}
