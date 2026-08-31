"use client";

import { useEffect, useId, useRef, useState } from "react";
import {
  downloadQrPng,
  generateQrDataUrl,
  QR_PREVIEW_CSS_PX,
  qrFilenameFromTitle,
} from "@/lib/qr";
import { ui } from "@/lib/ui-id";

type FormShareQrDialogProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
};

export function FormShareQrDialog({
  open,
  onClose,
  url,
  title,
}: FormShareQrDialogProps) {
  if (!open) return null;

  return (
    <FormShareQrDialogContent url={url} title={title} onClose={onClose} />
  );
}

function FormShareQrDialogContent({
  url,
  title,
  onClose,
}: {
  url: string;
  title: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    void generateQrDataUrl(url)
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch(() => {
        if (!cancelled) setError(ui.shareQrFailed);
      });

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [url, onClose]);

  async function downloadQr() {
    if (!dataUrl) return;
    try {
      const highRes = await generateQrDataUrl(url, "download");
      downloadQrPng(highRes, qrFilenameFromTitle(title));
    } catch {
      downloadQrPng(dataUrl, qrFilenameFromTitle(title));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="presentation"
    >
      <button
        type="button"
        aria-label={ui.close}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="forma-section relative z-10 w-full max-w-sm space-y-4 p-6 shadow-lg shadow-black/10"
      >
        <div className="space-y-1">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
          >
            {ui.shareQrTitle}
          </h2>
          <p className="text-sm text-ink-muted">{ui.shareQrHint}</p>
        </div>

        <div className="flex flex-col items-center gap-3">
          {error ? (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          ) : dataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- inline QR data URL
            <img
              src={dataUrl}
              alt={ui.shareQrAlt(title)}
              width={QR_PREVIEW_CSS_PX}
              height={QR_PREVIEW_CSS_PX}
              className="rounded-md border border-border bg-white p-3 [image-rendering:crisp-edges]"
            />
          ) : (
            <div
              className="flex items-center justify-center rounded-md border border-dashed border-border bg-white text-sm text-ink-muted"
              style={{
                width: QR_PREVIEW_CSS_PX,
                height: QR_PREVIEW_CSS_PX,
              }}
              aria-busy="true"
            >
              {ui.loading}
            </div>
          )}
          <p className="w-full break-all text-center font-mono text-xs text-ink-muted">
            {url}
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium hover:border-ink-muted"
          >
            {ui.close}
          </button>
          <button
            type="button"
            disabled={!dataUrl}
            onClick={downloadQr}
            className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
          >
            {ui.downloadQrCode}
          </button>
        </div>
      </div>
    </div>
  );
}
