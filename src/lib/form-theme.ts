import type { CSSProperties } from "react";
import {
  DEFAULT_FORM_THEME_ID,
  FORM_THEMES,
  type FormThemeId,
} from "@/lib/form-constants";

export function isFormThemeId(value: string | null | undefined): value is FormThemeId {
  return Boolean(value && value in FORM_THEMES);
}

export function resolveFormTheme(themeId?: string | null) {
  const id = isFormThemeId(themeId) ? themeId : DEFAULT_FORM_THEME_ID;
  return { id, ...FORM_THEMES[id] };
}

export function formThemeStyle(themeId?: string | null): CSSProperties {
  const theme = resolveFormTheme(themeId);
  return {
    backgroundColor: theme.background,
    "--color-accent": theme.accent,
    "--color-accent-hover": theme.accentHover,
    "--color-focus": theme.focus,
    "--color-bg": theme.background,
  } as CSSProperties;
}
