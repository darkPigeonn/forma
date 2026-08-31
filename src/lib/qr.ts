import QRCode, { type QRCodeToDataURLOptions } from "qrcode";

/** CSS size shown in the preview dialog. */
export const QR_PREVIEW_CSS_PX = 320;

/** Pixel size for downloaded PNG (suitable for print / posters). */
export const QR_DOWNLOAD_PX = 1200;

const QR_RENDER_OPTIONS: Pick<
  QRCodeToDataURLOptions,
  "errorCorrectionLevel" | "margin" | "color"
> = {
  // High redundancy — tolerates glare, partial cover, and print scaling.
  errorCorrectionLevel: "H",
  // Quiet zone (min. 4 modules per ISO/IEC 18004).
  margin: 4,
  color: { dark: "#000000", light: "#ffffff" },
};

function previewPixelSize(): number {
  if (typeof window === "undefined") {
    return QR_PREVIEW_CSS_PX * 2;
  }
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  return Math.round(QR_PREVIEW_CSS_PX * dpr);
}

export type QrPurpose = "preview" | "download";

export async function generateQrDataUrl(
  url: string,
  purpose: QrPurpose = "preview",
): Promise<string> {
  const width = purpose === "download" ? QR_DOWNLOAD_PX : previewPixelSize();

  return QRCode.toDataURL(url, {
    ...QR_RENDER_OPTIONS,
    width,
  });
}

export function downloadQrPng(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function qrFilenameFromTitle(title: string): string {
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "form";
  return `forma-qr-${slug}.png`;
}
