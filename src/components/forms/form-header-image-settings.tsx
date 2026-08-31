"use client";

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormHeaderBanner } from "@/components/forms/form-header-banner";
import type { FormHeaderImageMeta } from "@/lib/storage/form-header";
import { resolveFormTheme } from "@/lib/form-theme";
import type { FormThemeId } from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

type FormHeaderImageSettingsProps = {
  formId: string;
  title: string;
  themeId: FormThemeId;
  headerImage: FormHeaderImageMeta | null;
  disabled?: boolean;
  onUploadStateChange?: (uploading: boolean) => void;
};

export function FormHeaderImageSettings({
  formId,
  title,
  themeId,
  headerImage,
  disabled = false,
  onUploadStateChange,
}: FormHeaderImageSettingsProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<FormHeaderImageMeta | null>(headerImage);
  const [prevHeaderImage, setPrevHeaderImage] = useState(headerImage);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = resolveFormTheme(themeId);

  if (headerImage !== prevHeaderImage && !uploading) {
    setPrevHeaderImage(headerImage);
    setPreview(headerImage);
  }

  async function uploadFile(file: File) {
    setError(null);
    setUploading(true);
    onUploadStateChange?.(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch(`/api/forms/${formId}/header`, {
        method: "POST",
        body,
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        headerImage?: FormHeaderImageMeta | null;
      };
      if (!res.ok || !data.ok || !data.headerImage) {
        setError(data.error ?? ui.headerImageUploadFailed);
        return;
      }
      setPreview(data.headerImage);
      router.refresh();
    } catch {
      setError(ui.headerImageUploadFailed);
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function removeImage() {
    setError(null);
    setUploading(true);
    onUploadStateChange?.(true);
    try {
      const res = await fetch(`/api/forms/${formId}/header`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? ui.headerImageUploadFailed);
        return;
      }
      setPreview(null);
      router.refresh();
    } catch {
      setError(ui.headerImageUploadFailed);
    } finally {
      setUploading(false);
      onUploadStateChange?.(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border">
        <FormHeaderBanner
          headerImage={preview}
          themeHeaderColor={theme.header}
          title={title}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,.jpg,.jpeg,.png,.gif,.webp"
          className="sr-only"
          disabled={disabled || uploading}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void uploadFile(file);
          }}
        />
        <label
          htmlFor={inputId}
          className={`inline-flex min-h-11 cursor-pointer items-center rounded-md border border-border bg-bg-elevated px-4 text-sm font-medium text-ink hover:border-ink-muted ${
            disabled || uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? ui.uploadingFile : ui.chooseHeaderImage}
        </label>
        {preview ? (
          <button
            type="button"
            disabled={disabled || uploading}
            onClick={() => void removeImage()}
            className="inline-flex min-h-11 items-center rounded-md border border-border px-4 text-sm font-medium text-danger hover:border-danger disabled:opacity-60"
          >
            {ui.removeHeaderImage}
          </button>
        ) : null}
      </div>

      <p className="text-xs text-ink-muted">{ui.headerImageHint}</p>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
