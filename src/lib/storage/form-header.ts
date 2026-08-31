import { createId } from "@paralleldrive/cuid2";
import {
  HEADER_IMAGE_ALLOWED_MIME,
  HEADER_IMAGE_MAX_BYTES,
} from "@/lib/form-constants";
import {
  getAdminStorage,
  getStorageBucketName,
} from "@/lib/firebase/admin";
import {
  applyImageExtension,
  compressImageBuffer,
} from "@/lib/storage/compress-image";
import {
  deleteS3Object,
  isS3StorageConfigured,
  putS3Object,
  resolveViewableFileUrl,
} from "@/lib/storage/s3";
import { ui } from "@/lib/ui-id";

export type FormHeaderImageMeta = {
  path: string;
  url: string;
  contentType: string;
};

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

export function assertHeaderImageAllowed(file: {
  size: number;
  type: string;
  name: string;
}): { ok: true } | { ok: false; error: string } {
  if (!file.name?.trim()) {
    return { ok: false, error: ui.invalidHeaderImage };
  }
  if (file.size <= 0 || file.size > HEADER_IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: ui.headerImageTooLarge,
    };
  }
  const lower = file.name.toLowerCase();
  const hasImageExt = /\.(jpe?g|png|gif|webp)$/i.test(lower);
  if (
    !(HEADER_IMAGE_ALLOWED_MIME as readonly string[]).includes(file.type) &&
    !hasImageExt
  ) {
    return { ok: false, error: ui.headerImageTypeInvalid };
  }
  return { ok: true };
}

export function isFormHeaderPath(path: string, formId: string): boolean {
  return path.startsWith(`form-headers/${formId}/`);
}

async function readFirebaseUrlForPath(path: string): Promise<string> {
  const bucket = getAdminStorage().bucket(getStorageBucketName());
  const file = bucket.file(path);
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });
  return url;
}

export async function resolveFormHeaderImage(
  raw:
    | {
        path?: string | null;
        url?: string | null;
        contentType?: string | null;
      }
    | null
    | undefined,
): Promise<FormHeaderImageMeta | null> {
  const path = raw?.path?.trim();
  if (!path || !path.startsWith("form-headers/")) return null;
  const contentType = raw?.contentType?.trim() || "image/jpeg";

  if (isS3StorageConfigured()) {
    const url =
      (await resolveViewableFileUrl(path, { expiresInSeconds: 60 * 60 })) ??
      path;
    return { path, url, contentType };
  }

  try {
    const url = await readFirebaseUrlForPath(path);
    return { path, url, contentType };
  } catch {
    return raw?.url
      ? { path, url: raw.url, contentType }
      : null;
  }
}

export async function uploadFormHeaderImage(input: {
  formId: string;
  buffer: Buffer;
  contentType: string;
  originalName: string;
}): Promise<FormHeaderImageMeta> {
  const allowed = assertHeaderImageAllowed({
    size: input.buffer.length,
    type: input.contentType,
    name: input.originalName,
  });
  if (!allowed.ok) {
    throw new Error(allowed.error);
  }

  const compressed = await compressImageBuffer({
    buffer: input.buffer,
    contentType: input.contentType,
    originalName: input.originalName,
    preset: "header",
  });

  const safeName =
    sanitizeFileName(
      applyImageExtension(input.originalName, compressed.extension),
    ) || `header.${compressed.extension}`;
  const path = `form-headers/${input.formId}/${createId()}-${safeName}`;
  const contentType = compressed.contentType;
  const body = compressed.buffer;

  if (isS3StorageConfigured()) {
    const storedUrl = await putS3Object({
      key: path,
      body,
      contentType,
      cacheControl: "private, max-age=0, no-cache",
    });
    return { path, url: storedUrl, contentType };
  }

  const bucket = getAdminStorage().bucket(getStorageBucketName());
  const file = bucket.file(path);

  await file.save(body, {
    contentType,
    resumable: false,
    metadata: {
      metadata: {
        formId: input.formId,
        kind: "form-header",
      },
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  const url = await readFirebaseUrlForPath(path);
  return { path, url, contentType };
}

export async function deleteFormHeaderImage(path: string): Promise<void> {
  if (!path.startsWith("form-headers/")) return;

  if (isS3StorageConfigured()) {
    await deleteS3Object(path);
    return;
  }

  const bucket = getAdminStorage().bucket(getStorageBucketName());
  await bucket.file(path).delete({ ignoreNotFound: true });
}
