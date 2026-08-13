import { createId } from "@paralleldrive/cuid2";
import {
  FILE_UPLOAD_ALLOWED_MIME,
  FILE_UPLOAD_MAX_BYTES,
} from "@/lib/form-constants";
import {
  getAdminStorage,
  getStorageBucketName,
} from "@/lib/firebase/admin";

export type UploadedFileMeta = {
  name: string;
  url: string;
  size: number;
  contentType: string;
  path: string;
};

function sanitizeFileName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-()+ ]+/g, "_")
    .replace(/\s+/g, "-")
    .slice(0, 120);
}

export function assertUploadAllowed(file: {
  size: number;
  type: string;
  name: string;
}): { ok: true } | { ok: false; error: string } {
  if (!file.name?.trim()) {
    return { ok: false, error: "Nama file tidak valid" };
  }
  if (file.size <= 0 || file.size > FILE_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      error: `Ukuran file maksimal ${Math.round(FILE_UPLOAD_MAX_BYTES / (1024 * 1024))} MB`,
    };
  }
  if (
    !(FILE_UPLOAD_ALLOWED_MIME as readonly string[]).includes(file.type) &&
    file.type !== "application/octet-stream"
  ) {
    // Allow octet-stream only if extension looks safe; otherwise reject unknown
    const lower = file.name.toLowerCase();
    const okExt =
      /\.(jpe?g|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv)$/i.test(lower);
    if (!okExt) {
      return {
        ok: false,
        error:
          "Jenis file tidak didukung. Gunakan gambar, PDF, Word, Excel, TXT, atau CSV.",
      };
    }
  }
  return { ok: true };
}

export async function uploadFormFile(input: {
  formId: string;
  questionId: string;
  buffer: Buffer;
  contentType: string;
  originalName: string;
}): Promise<UploadedFileMeta> {
  const allowed = assertUploadAllowed({
    size: input.buffer.length,
    type: input.contentType,
    name: input.originalName,
  });
  if (!allowed.ok) {
    throw new Error(allowed.error);
  }

  const bucketName = getStorageBucketName();
  const bucket = getAdminStorage().bucket(bucketName);
  const safeName = sanitizeFileName(input.originalName) || "file";
  const path = `form-uploads/${input.formId}/${input.questionId}/${createId()}-${safeName}`;
  const file = bucket.file(path);

  await file.save(input.buffer, {
    contentType: input.contentType || "application/octet-stream",
    resumable: false,
    metadata: {
      metadata: {
        originalName: input.originalName.slice(0, 255),
        formId: input.formId,
        questionId: input.questionId,
      },
      cacheControl: "private, max-age=0",
    },
  });

  // Signed URL valid 7 days — durable enough for MVP review; owner can re-fetch later via path if needed
  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  return {
    name: input.originalName.slice(0, 255),
    url,
    size: input.buffer.length,
    contentType: input.contentType || "application/octet-stream",
    path,
  };
}

export function isFileAnswerValue(value: unknown): value is UploadedFileMeta {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === "string" &&
    typeof v.url === "string" &&
    typeof v.size === "number" &&
    typeof v.contentType === "string" &&
    typeof v.path === "string"
  );
}
