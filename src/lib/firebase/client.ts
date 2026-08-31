import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  browserPopupRedirectResolver,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let browserAuth: Auth | undefined;

function assertClientConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error(
      "Missing Firebase client config. Set NEXT_PUBLIC_FIREBASE_* in .env.local",
    );
  }
}

export function getFirebaseApp(): FirebaseApp {
  assertClientConfig();
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function getClientAuth(): Auth {
  if (browserAuth) {
    return browserAuth;
  }

  const app = getFirebaseApp();

  if (typeof window === "undefined") {
    return getAuth(app);
  }

  try {
    browserAuth = initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
      popupRedirectResolver: browserPopupRedirectResolver,
    });
  } catch {
    browserAuth = getAuth(app);
  }

  return browserAuth;
}

export { browserPopupRedirectResolver };
