"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { completeProfileAction } from "@/app/actions/profile";
import { ui } from "@/lib/ui-id";

type CompleteProfileFormProps = {
  initialName: string;
  initialPhone?: string | null;
};

export function CompleteProfileForm({
  initialName,
  initialPhone,
}: CompleteProfileFormProps) {
  const router = useRouter();
  const nameId = useId();
  const phoneId = useId();
  const errorId = useId();

  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    try {
      const result = await completeProfileAction({ name, phone });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError(ui.profileSaveFailed);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <p className="text-sm text-ink-muted">{ui.completeProfileHint}</p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={nameId} className="text-sm font-medium text-ink">
          {ui.name}
        </label>
        <input
          id={nameId}
          name="name"
          type="text"
          autoComplete="name"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-ink"
          placeholder={ui.yourName}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={phoneId} className="text-sm font-medium text-ink">
          {ui.phoneOptional}
        </label>
        <input
          id={phoneId}
          name="phone"
          type="tel"
          autoComplete="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="min-h-11 rounded-md border border-border bg-bg-elevated px-3 text-ink"
          placeholder={ui.phonePlaceholder}
        />
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 rounded-md bg-accent px-4 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? ui.savingProfile : ui.saveProfile}
      </button>
    </form>
  );
}
