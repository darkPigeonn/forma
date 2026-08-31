"use client";

import {
  FORM_THEME_IDS,
  FORM_THEMES,
  type FormThemeId,
} from "@/lib/form-constants";
import { ui } from "@/lib/ui-id";

type FormThemePickerProps = {
  value: FormThemeId;
  disabled?: boolean;
  onChange: (themeId: FormThemeId) => void;
};

export function FormThemePicker({
  value,
  disabled,
  onChange,
}: FormThemePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ui.formTheme}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4"
    >
      {FORM_THEME_IDS.map((id) => {
        const tokens = FORM_THEMES[id];
        const selected = value === id;
        return (
          <label
            key={id}
            className={`flex cursor-pointer flex-col gap-2 rounded-md border bg-bg-elevated p-2 transition ${
              selected
                ? "border-accent ring-1 ring-accent/30"
                : "border-border hover:border-ink-muted"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name="form-theme"
              value={id}
              checked={selected}
              disabled={disabled}
              onChange={() => onChange(id)}
              className="sr-only"
            />
            <span
              className="flex h-12 overflow-hidden rounded-sm border border-border"
              aria-hidden="true"
            >
              <span
                className="w-3 shrink-0"
                style={{ backgroundColor: tokens.header }}
              />
              <span
                className="flex-1"
                style={{ backgroundColor: tokens.background }}
              />
              <span
                className="w-8 shrink-0"
                style={{ backgroundColor: tokens.accent }}
              />
            </span>
            <span className="text-sm font-medium text-ink">
              {ui.formThemes[id]}
            </span>
          </label>
        );
      })}
    </div>
  );
}
