"use client";

import { useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateFormMetaAction,
} from "@/app/actions/forms";
import { FormCollaboratorsSettings } from "@/components/forms/form-collaborators-settings";
import { FormThemePicker } from "@/components/forms/form-theme-picker";
import { FormHeaderImageSettings } from "@/components/forms/form-header-image-settings";
import type { FormDetail } from "@/db/queries/forms";
import {
  DEFAULT_FORM_THEME_ID,
  UNIQUE_BY_MODES,
  type FormThemeId,
  type UniqueByMode,
} from "@/lib/form-constants";
import { featureFlags } from "@/lib/feature-flags";
import { ui } from "@/lib/ui-id";

type FormSettingsProps = {
  form: FormDetail;
};

export function FormSettingsPanel({ form }: FormSettingsProps) {
  const router = useRouter();
  const confirmId = useId();
  const liveId = useId();

  const [confirmationMessage, setConfirmationMessage] = useState(
    form.confirmationMessage,
  );
  const [themeId, setThemeId] = useState<FormThemeId>(
    form.themeId ?? DEFAULT_FORM_THEME_ID,
  );
  const [limitOneResponse, setLimitOneResponse] = useState(
    Boolean(form.limitOneResponse),
  );
  const [collectRespondentEmail, setCollectRespondentEmail] = useState(
    Boolean(form.collectRespondentEmail),
  );
  const [uniqueBy, setUniqueBy] = useState<UniqueByMode>(
    form.uniqueBy ?? "browser",
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [prevFormSnapshot, setPrevFormSnapshot] = useState({
    confirmationMessage: form.confirmationMessage,
    themeId: form.themeId ?? DEFAULT_FORM_THEME_ID,
    limitOneResponse: Boolean(form.limitOneResponse),
    collectRespondentEmail: Boolean(form.collectRespondentEmail),
    uniqueBy: form.uniqueBy ?? "browser",
    headerImage: form.headerImage,
  });

  const formSnapshot = {
    confirmationMessage: form.confirmationMessage,
    themeId: form.themeId ?? DEFAULT_FORM_THEME_ID,
    limitOneResponse: Boolean(form.limitOneResponse),
    collectRespondentEmail: Boolean(form.collectRespondentEmail),
    uniqueBy: form.uniqueBy ?? "browser",
    headerImage: form.headerImage,
  };

  if (
    formSnapshot.confirmationMessage !== prevFormSnapshot.confirmationMessage ||
    formSnapshot.themeId !== prevFormSnapshot.themeId ||
    formSnapshot.limitOneResponse !== prevFormSnapshot.limitOneResponse ||
    formSnapshot.collectRespondentEmail !==
      prevFormSnapshot.collectRespondentEmail ||
    formSnapshot.uniqueBy !== prevFormSnapshot.uniqueBy ||
    formSnapshot.headerImage !== prevFormSnapshot.headerImage
  ) {
    setPrevFormSnapshot(formSnapshot);
    setConfirmationMessage(formSnapshot.confirmationMessage);
    setThemeId(formSnapshot.themeId);
    setLimitOneResponse(formSnapshot.limitOneResponse);
    setCollectRespondentEmail(formSnapshot.collectRespondentEmail);
    setUniqueBy(formSnapshot.uniqueBy);
  }

  function saveConfirmation() {
    if (confirmationMessage === form.confirmationMessage) return;
    setError(null);
    setSaveState("saving");
    startTransition(async () => {
      const result = await updateFormMetaAction({
        formId: form.id,
        confirmationMessage,
      });
      if (!result.ok) {
        setError(result.error);
        setSaveState("idle");
        return;
      }
      setSaveState("saved");
      router.refresh();
      window.setTimeout(() => setSaveState("idle"), 1500);
    });
  }

  return (
    <div className="space-y-8">
      <p className="text-sm text-ink-muted">{ui.settingsHint}</p>

      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <section className="forma-section space-y-4" aria-labelledby="form-theme-heading">
        <h2
          id="form-theme-heading"
          className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
        >
          {ui.formTheme}
        </h2>
        <p className="text-sm text-ink-muted">{ui.formThemeHint}</p>
        <FormThemePicker
          value={themeId}
          disabled={isPending}
          onChange={(next) => {
            if (next === themeId) return;
            setThemeId(next);
            setError(null);
            setSaveState("saving");
            startTransition(async () => {
              const result = await updateFormMetaAction({
                formId: form.id,
                themeId: next,
              });
              if (!result.ok) {
                setError(result.error);
                setThemeId(form.themeId ?? DEFAULT_FORM_THEME_ID);
                setSaveState("idle");
                return;
              }
              setSaveState("saved");
              router.refresh();
              window.setTimeout(() => setSaveState("idle"), 1500);
            });
          }}
        />
      </section>

      <section className="forma-section space-y-4" aria-labelledby="form-header-image-heading">
        <h2
          id="form-header-image-heading"
          className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
        >
          {ui.formHeaderImage}
        </h2>
        <p className="text-sm text-ink-muted">{ui.formHeaderImageHint}</p>
        <FormHeaderImageSettings
          formId={form.id}
          title={form.title}
          themeId={themeId}
          headerImage={form.headerImage}
          disabled={isPending}
          onUploadStateChange={(uploading) => {
            setSaveState(uploading ? "saving" : "idle");
          }}
        />
      </section>

      <section className="forma-section space-y-4" aria-labelledby="form-details-heading">
        <div className="flex items-center justify-between gap-3">
          <h2
            id="form-details-heading"
            className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
          >
            {ui.afterSubmit}
          </h2>
          <p id={liveId} className="text-sm text-ink-muted" aria-live="polite">
            {saveState === "saving"
              ? ui.saving
              : saveState === "saved"
                ? ui.saved
                : null}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={confirmId} className="text-sm font-medium">
            {ui.confirmationMessage}
          </label>
          <textarea
            id={confirmId}
            value={confirmationMessage}
            onChange={(e) => setConfirmationMessage(e.target.value)}
            onBlur={saveConfirmation}
            rows={2}
            className="rounded-md border border-border bg-bg-elevated px-3 py-2"
            maxLength={1000}
          />
          <p className="text-xs text-ink-muted">{ui.confirmationHint}</p>
        </div>
      </section>

      <section className="forma-section space-y-3" aria-labelledby="form-limit-heading">
        <h2
          id="form-limit-heading"
          className="font-[family-name:var(--font-fraunces)] text-xl font-semibold"
        >
          {ui.responsesLimit}
        </h2>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={limitOneResponse}
            disabled={isPending}
            onChange={(event) => {
              const next = event.target.checked;
              setLimitOneResponse(next);
              setError(null);
              setSaveState("saving");
              startTransition(async () => {
                const result = await updateFormMetaAction({
                  formId: form.id,
                  limitOneResponse: next,
                  uniqueBy: next ? uniqueBy : "browser",
                });
                if (!result.ok) {
                  setError(result.error);
                  setLimitOneResponse(Boolean(form.limitOneResponse));
                  setSaveState("idle");
                  return;
                }
                setSaveState("saved");
                router.refresh();
                window.setTimeout(() => setSaveState("idle"), 1500);
              });
            }}
            className="mt-1 size-4 accent-[var(--color-accent)]"
          />
          <span>
            {ui.limitOneResponse}
            <span className="mt-1 block font-normal text-ink-muted">
              {ui.limitOneResponseHint}
            </span>
          </span>
        </label>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={collectRespondentEmail}
            disabled={isPending}
            onChange={(event) => {
              const next = event.target.checked;
              setCollectRespondentEmail(next);
              setError(null);
              setSaveState("saving");
              startTransition(async () => {
                const result = await updateFormMetaAction({
                  formId: form.id,
                  collectRespondentEmail: next,
                });
                if (!result.ok) {
                  setError(result.error);
                  setCollectRespondentEmail(Boolean(form.collectRespondentEmail));
                  setSaveState("idle");
                  return;
                }
                setSaveState("saved");
                router.refresh();
                window.setTimeout(() => setSaveState("idle"), 1500);
              });
            }}
            className="mt-1 size-4 accent-[var(--color-accent)]"
          />
          <span>
            {ui.collectRespondentEmail}
            <span className="mt-1 block font-normal text-ink-muted">
              {ui.collectRespondentEmailHint}
            </span>
          </span>
        </label>
        {limitOneResponse ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{ui.uniqueByLabel}</legend>
            {UNIQUE_BY_MODES.map((mode) => (
              <label
                key={mode}
                className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"
              >
                <input
                  type="radio"
                  name="unique-by"
                  value={mode}
                  checked={uniqueBy === mode}
                  disabled={isPending}
                  onChange={() => {
                    setUniqueBy(mode);
                    setError(null);
                    setSaveState("saving");
                    startTransition(async () => {
                      const result = await updateFormMetaAction({
                        formId: form.id,
                        uniqueBy: mode,
                        limitOneResponse: true,
                      });
                      if (!result.ok) {
                        setError(result.error);
                        setUniqueBy(form.uniqueBy ?? "browser");
                        setSaveState("idle");
                        return;
                      }
                      setSaveState("saved");
                      router.refresh();
                      window.setTimeout(() => setSaveState("idle"), 1500);
                    });
                  }}
                  className="size-4 accent-[var(--color-accent)]"
                />
                {mode === "browser"
                  ? ui.uniqueByBrowser
                  : mode === "phone"
                    ? ui.uniqueByPhone
                    : ui.uniqueByEmail}
              </label>
            ))}
          </fieldset>
        ) : null}
      </section>

      {featureFlags.collaborators && form.accessRole === "owner" ? (
        <FormCollaboratorsSettings formId={form.id} />
      ) : null}
    </div>
  );
}
