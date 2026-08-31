import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let cachedClient: S3Client | null = null;

const PLACEHOLDER_VALUES = new Set([
  "",
  "your-access-key-id",
  "your-secret-access-key",
  "your-bucket-name",
]);

function trimEnv(key: string): string | undefined {
  const value = process.env[key]?.trim();
  return value || undefined;
}

function isUsableValue(value?: string): boolean {
  const normalized = (value || "").trim();
  return Boolean(normalized) && !PLACEHOLDER_VALUES.has(normalized);
}

/** Fixes common typo: `yAKIA...` → `AKIA...` */
export function normalizeAccessKeyId(value?: string): string {
  const trimmed = (value || "").trim();
  if (/^yAKI[A-Z0-9]/.test(trimmed)) return trimmed.slice(1);
  return trimmed;
}

function getAwsAccessKeyId(): string | undefined {
  const value =
    trimEnv("AWS_ACCESS_KEY_ID") ?? trimEnv("S3_ACCESS_KEY_ID");
  const normalized = normalizeAccessKeyId(value);
  return isUsableValue(normalized) ? normalized : undefined;
}

function getAwsSecretAccessKey(): string | undefined {
  const value =
    trimEnv("AWS_SECRET_ACCESS_KEY") ?? trimEnv("S3_SECRET_ACCESS_KEY");
  return isUsableValue(value) ? value : undefined;
}

export function getAwsRegion(): string {
  return (
    trimEnv("AWS_REGION") ??
    trimEnv("AWS_S3_REGION") ??
    trimEnv("S3_REGION") ??
    "ap-southeast-3"
  );
}

export function getAwsBucket(): string | undefined {
  const value =
    trimEnv("AWS_BUCKET") ??
    trimEnv("AWS_S3_BUCKET") ??
    trimEnv("S3_BUCKET");
  return isUsableValue(value) ? value : undefined;
}

/** Optional key prefix, e.g. `survei_keuskupan` → `survei_keuskupan/form-headers/...` */
export function getObjectKeyPrefix(): string {
  const prefix =
    trimEnv("AWS_S3_PREFIX") ?? trimEnv("S3_PREFIX") ?? trimEnv("AWS_PREFIX") ?? "";
  return prefix.replace(/^\/+|\/+$/g, "");
}

export function withObjectKeyPrefix(key: string): string {
  const prefix = getObjectKeyPrefix();
  if (!prefix) return key;
  const normalizedKey = key.replace(/^\/+/, "");
  if (normalizedKey.startsWith(`${prefix}/`)) return normalizedKey;
  return `${prefix}/${normalizedKey}`;
}

export function stripObjectKeyPrefix(key: string): string {
  const prefix = getObjectKeyPrefix();
  if (!prefix) return key;
  const normalizedKey = key.replace(/^\/+/, "");
  if (normalizedKey.startsWith(`${prefix}/`)) {
    return normalizedKey.slice(prefix.length + 1);
  }
  return normalizedKey;
}

function getDocumentEndpoint(): string | undefined {
  return trimEnv("DOCUMENT_STORAGE_ENDPOINT") ?? trimEnv("S3_ENDPOINT");
}

export function isS3StorageConfigured(): boolean {
  return Boolean(
    getAwsAccessKeyId() && getAwsSecretAccessKey() && getAwsBucket(),
  );
}

function getS3Client(): S3Client {
  if (!isS3StorageConfigured()) {
    throw new Error("S3 storage is not configured");
  }
  if (!cachedClient) {
    const endpoint = getDocumentEndpoint()?.replace(/\/$/, "");
    cachedClient = new S3Client({
      region: getAwsRegion(),
      forcePathStyle: true,
      ...(endpoint ? { endpoint } : {}),
      credentials: {
        accessKeyId: getAwsAccessKeyId()!,
        secretAccessKey: getAwsSecretAccessKey()!,
      },
    });
  }
  return cachedClient;
}

/** Canonical private reference stored in Mongo (`s3://bucket/key`). */
export function buildStoredFileUrl(key: string): string {
  const bucket = getAwsBucket()!;
  return `s3://${bucket}/${key}`;
}

export function extractObjectKeyFromUrl(value: string): string | null {
  const raw = (value || "").trim();
  if (!raw) return null;

  if (raw.startsWith("s3://")) {
    const withoutScheme = raw.slice("s3://".length);
    const slash = withoutScheme.indexOf("/");
    if (slash < 0) return null;
    return decodeURIComponent(withoutScheme.slice(slash + 1));
  }

  try {
    const url = new URL(raw);
    const host = url.hostname;
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));

    if (!host.includes("amazonaws.com")) {
      return pathname || null;
    }

    if (host.startsWith("s3.") || host === "s3.amazonaws.com") {
      const parts = pathname.split("/");
      if (parts.length >= 2) return parts.slice(1).join("/");
    }

    if (host.includes(".s3.")) {
      return pathname || null;
    }

    return pathname || null;
  } catch {
    return null;
  }
}

export function isManagedObjectUrl(value?: string | null): boolean {
  if (!value) return false;
  if (value.startsWith("s3://")) return true;
  try {
    const host = new URL(value).hostname;
    return host.includes("amazonaws.com");
  } catch {
    return false;
  }
}

export async function createSignedDownloadUrl(
  key: string,
  expiresInSeconds = 60 * 15,
): Promise<string> {
  const bucket = getAwsBucket()!;
  const objectKey = withObjectKeyPrefix(key);
  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: bucket, Key: objectKey }),
    { expiresIn: expiresInSeconds },
  );
}

/**
 * Resolve a DB-stored file reference into a browser-openable URL.
 * Legacy HTTPS URLs are re-signed when they point at our bucket.
 */
export async function resolveViewableFileUrl(
  storedUrlOrPath?: string | null,
  options?: { expiresInSeconds?: number },
): Promise<string | null> {
  if (!storedUrlOrPath) return null;
  if (!isS3StorageConfigured()) return storedUrlOrPath;

  const key = isS3ObjectKey(storedUrlOrPath)
    ? storedUrlOrPath
    : extractObjectKeyFromUrl(storedUrlOrPath);

  if (!key) return storedUrlOrPath;

  try {
    return await createSignedDownloadUrl(
      key,
      options?.expiresInSeconds ?? 60 * 15,
    );
  } catch (error) {
    console.error("Failed to create signed URL:", error);
    return storedUrlOrPath;
  }
}

/** @deprecated Prefer resolveViewableFileUrl — kept for call sites migrating off public ACLs */
export async function s3PublicUrl(key: string): Promise<string> {
  return (
    (await resolveViewableFileUrl(key, { expiresInSeconds: 60 * 60 })) ?? key
  );
}

/**
 * Upload a private object. Never sets public ACL (same as simk-garum).
 * Returns the canonical `s3://` reference for persistence.
 */
export async function putS3Object(input: {
  key: string;
  body: Buffer;
  contentType: string;
  cacheControl?: string;
}): Promise<string> {
  const bucket = getAwsBucket()!;
  const objectKey = withObjectKeyPrefix(input.key);
  await getS3Client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: input.body,
      ContentType: input.contentType,
      CacheControl: input.cacheControl ?? "private, max-age=0, no-cache",
    }),
  );
  return buildStoredFileUrl(input.key);
}

export async function deleteS3Object(key: string): Promise<void> {
  if (!isS3StorageConfigured()) return;
  const bucket = getAwsBucket()!;
  const objectKey = withObjectKeyPrefix(key);
  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}

export function isS3ObjectKey(path: string): boolean {
  return (
    path.startsWith("form-uploads/") ||
    path.startsWith("form-headers/") ||
    path.startsWith("forma/")
  );
}
