import sharp from "sharp";
import {
  HEADER_IMAGE_COMPRESS_MAX_HEIGHT,
  HEADER_IMAGE_COMPRESS_MAX_WIDTH,
  HEADER_IMAGE_COMPRESS_QUALITY,
  UPLOAD_IMAGE_COMPRESS_MAX_HEIGHT,
  UPLOAD_IMAGE_COMPRESS_MAX_WIDTH,
  UPLOAD_IMAGE_COMPRESS_QUALITY,
} from "@/lib/form-constants";

const COMPRESSIBLE_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export type ImageCompressPreset = "header" | "upload";

export type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  /** Suggested file extension without dot, e.g. `webp` */
  extension: string;
  compressed: boolean;
};

export function isCompressibleImageMime(contentType: string): boolean {
  return COMPRESSIBLE_MIME.has(contentType.toLowerCase());
}

function presetOptions(preset: ImageCompressPreset): {
  maxWidth: number;
  maxHeight: number;
  quality: number;
} {
  if (preset === "header") {
    return {
      maxWidth: HEADER_IMAGE_COMPRESS_MAX_WIDTH,
      maxHeight: HEADER_IMAGE_COMPRESS_MAX_HEIGHT,
      quality: HEADER_IMAGE_COMPRESS_QUALITY,
    };
  }
  return {
    maxWidth: UPLOAD_IMAGE_COMPRESS_MAX_WIDTH,
    maxHeight: UPLOAD_IMAGE_COMPRESS_MAX_HEIGHT,
    quality: UPLOAD_IMAGE_COMPRESS_QUALITY,
  };
}

function replaceImageExtension(fileName: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, "");
  return `${base || "image"}.${extension}`;
}

/**
 * Resize and re-encode raster images to reduce storage/bandwidth.
 * Animated GIFs are left unchanged. On failure, returns the original buffer.
 */
export async function compressImageBuffer(input: {
  buffer: Buffer;
  contentType: string;
  originalName?: string;
  preset: ImageCompressPreset;
}): Promise<CompressedImage> {
  const contentType = input.contentType.toLowerCase() || "application/octet-stream";
  const fallbackExtension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/webp"
        ? "webp"
        : contentType === "image/gif"
          ? "gif"
          : "jpg";

  const unchanged = (): CompressedImage => ({
    buffer: input.buffer,
    contentType,
    extension: fallbackExtension,
    compressed: false,
  });

  if (!isCompressibleImageMime(contentType)) {
    return unchanged();
  }

  try {
    const image = sharp(input.buffer, { failOn: "none" });
    const metadata = await image.metadata();

    if (metadata.format === "gif" && (metadata.pages ?? 1) > 1) {
      return unchanged();
    }

    const { maxWidth, maxHeight, quality } = presetOptions(input.preset);
    const pipeline = image.rotate().resize({
      width: maxWidth,
      height: maxHeight,
      fit: "inside",
      withoutEnlargement: true,
    });

    const hasAlpha = Boolean(metadata.hasAlpha);
    let output: Buffer;
    let outputType: string;
    let extension: string;

    if (hasAlpha) {
      output = await pipeline.webp({ quality, effort: 4 }).toBuffer();
      outputType = "image/webp";
      extension = "webp";
    } else {
      output = await pipeline
        .jpeg({ quality, mozjpeg: true, chromaSubsampling: "4:2:0" })
        .toBuffer();
      outputType = "image/jpeg";
      extension = "jpg";
    }

    if (output.length >= input.buffer.length) {
      return unchanged();
    }

    return {
      buffer: output,
      contentType: outputType,
      extension,
      compressed: true,
    };
  } catch (error) {
    console.warn("Image compression skipped:", error);
    return unchanged();
  }
}

export function applyImageExtension(fileName: string, extension: string): string {
  return replaceImageExtension(fileName, extension);
}
