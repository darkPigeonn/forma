import {
  cert,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage, type Storage } from "firebase-admin/storage";

function getServiceAccount(): ServiceAccount {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY",
    );
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!;
  }

  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;

  return initializeApp({
    credential: cert(getServiceAccount()),
    storageBucket: bucket || undefined,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function getStorageBucketName(): string {
  const bucket =
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    process.env.FIREBASE_STORAGE_BUCKET;
  if (!bucket) {
    throw new Error(
      "Missing storage bucket. Set NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    );
  }
  return bucket;
}
