"use client";

import { useState } from "react";
import { FormShareQrDialog } from "@/components/forms/form-share-qr-dialog";
import {
  downloadQrPng,
  generateQrDataUrl,
  qrFilenameFromTitle,
} from "@/lib/qr";
import {
  publicFormUrl,
  whatsappShareCaption,
  whatsappShareHref,
} from "@/lib/share";
import { ui } from "@/lib/ui-id";

type FormShareMenuProps = {
  title: string;
  description: string;
  publicPath: string | null;
  siteOrigin: string;
};

const menuItemClass =
  "flex min-h-10 w-full items-center px-3 text-left text-sm hover:bg-border/30";

const triggerClass =
  "inline-flex min-h-11 cursor-pointer list-none items-center rounded-md border border-border bg-bg-elevated px-3 text-sm font-medium hover:border-ink-muted [&::-webkit-details-marker]:hidden";

export function FormShareMenu({
  title,
  description,
  publicPath,
  siteOrigin,
}: FormShareMenuProps) {
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrDownloading, setQrDownloading] = useState(false);

  if (!publicPath) {
    return null;
  }

  const url = publicFormUrl(publicPath, siteOrigin);
  const caption = whatsappShareCaption({ title, description, url });

  async function copyCaption() {
    try {
      await navigator.clipboard.writeText(caption);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  function downloadCard() {
    const canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#e8eef0";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#0f6e56";
    ctx.fillRect(0, 0, canvas.width, 28);
    ctx.fillStyle = "#ffffff";
    roundRect(ctx, 80, 80, 1040, 470, 16);
    ctx.fill();
    ctx.fillStyle = "#0f6e56";
    ctx.font = "600 36px Georgia, serif";
    ctx.fillText(ui.brand, 120, 160);
    ctx.fillStyle = "#1c1917";
    ctx.font = "600 52px Georgia, serif";
    wrapText(ctx, title || ui.untitledForm, 120, 250, 960, 62);
    ctx.fillStyle = "#57534e";
    ctx.font = "28px sans-serif";
    ctx.fillText(url, 120, 480);
    const link = document.createElement("a");
    link.download = "survei-share.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  async function downloadQr() {
    setQrDownloading(true);
    try {
      const dataUrl = await generateQrDataUrl(url, "download");
      downloadQrPng(dataUrl, qrFilenameFromTitle(title));
    } catch {
      // fallback: open dialog so user can retry
      setQrOpen(true);
    } finally {
      setQrDownloading(false);
    }
  }

  return (
    <>
      <details className="relative">
        <summary className={triggerClass}>{ui.shareMenu}</summary>
        <div className="absolute right-0 z-50 mt-1 min-w-[12rem] rounded-md border border-border bg-bg-elevated py-1 shadow-sm shadow-black/5">
          <a
            href={whatsappShareHref(caption)}
            target="_blank"
            rel="noopener noreferrer"
            className={menuItemClass}
          >
            {ui.shareWhatsApp}
          </a>
          <button
            type="button"
            onClick={() => void copyCaption()}
            className={menuItemClass}
          >
            {copied ? ui.captionCopied : ui.copyCaption}
          </button>
          <button
            type="button"
            onClick={() => setQrOpen(true)}
            className={menuItemClass}
          >
            {ui.showQrCode}
          </button>
          <button
            type="button"
            disabled={qrDownloading}
            onClick={() => void downloadQr()}
            className={menuItemClass}
          >
            {qrDownloading ? ui.loading : ui.downloadQrCode}
          </button>
          <button type="button" onClick={downloadCard} className={menuItemClass}>
            {ui.downloadShareCard}
          </button>
        </div>
      </details>

      <FormShareQrDialog
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        url={url}
        title={title}
      />
    </>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let drawY = y;
  let rows = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, drawY);
      line = word;
      drawY += lineHeight;
      rows += 1;
      if (rows >= 3) {
        ctx.fillText(`${word}…`, x, drawY);
        return;
      }
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x, drawY);
}
