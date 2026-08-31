export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "range",
  "email",
  "number",
  "date",
  "file_upload",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FORM_STATUSES = ["draft", "published", "closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

export const FORM_THEME_IDS = [
  "teal",
  "forest",
  "ocean",
  "sunset",
  "grape",
  "slate",
  "paper",
] as const;

export type FormThemeId = (typeof FORM_THEME_IDS)[number];

export const DEFAULT_FORM_THEME_ID: FormThemeId = "teal";

export const UNIQUE_BY_MODES = ["browser", "phone", "email"] as const;
export type UniqueByMode = (typeof UNIQUE_BY_MODES)[number];

export function isUniqueByMode(value: unknown): value is UniqueByMode {
  return UNIQUE_BY_MODES.includes(value as UniqueByMode);
}

export type FormThemeTokens = {
  accent: string;
  accentHover: string;
  background: string;
  header: string;
  focus: string;
};

export const FORM_THEMES: Record<FormThemeId, FormThemeTokens> = {
  teal: {
    accent: "#0f6e56",
    accentHover: "#0b5a46",
    background: "#e8eef0",
    header: "#0f6e56",
    focus: "#0f6e56",
  },
  forest: {
    accent: "#3f6212",
    accentHover: "#365314",
    background: "#eef2e6",
    header: "#3f6212",
    focus: "#3f6212",
  },
  ocean: {
    accent: "#0e7490",
    accentHover: "#155e75",
    background: "#e8f1f4",
    header: "#0e7490",
    focus: "#0e7490",
  },
  sunset: {
    accent: "#c2410c",
    accentHover: "#9a3412",
    background: "#f4eee8",
    header: "#c2410c",
    focus: "#c2410c",
  },
  grape: {
    accent: "#6d28d9",
    accentHover: "#5b21b6",
    background: "#f0eef6",
    header: "#6d28d9",
    focus: "#6d28d9",
  },
  slate: {
    accent: "#334155",
    accentHover: "#1e293b",
    background: "#e8eaee",
    header: "#334155",
    focus: "#334155",
  },
  paper: {
    accent: "#92400e",
    accentHover: "#78350f",
    background: "#f3efe6",
    header: "#b45309",
    focus: "#92400e",
  },
};

/** Max pages (sections) a form can have */
export const MAX_FORM_SECTIONS = 20;

/** Max upload size for file_upload answers (bytes) */
export const FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

/** Max upload size for form header images (bytes) */
export const HEADER_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

export const HEADER_IMAGE_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
] as const;

/** Server-side resize targets for header images */
export const HEADER_IMAGE_COMPRESS_MAX_WIDTH = 1920;
export const HEADER_IMAGE_COMPRESS_MAX_HEIGHT = 1080;
export const HEADER_IMAGE_COMPRESS_QUALITY = 82;

/** Server-side resize targets for file_upload image answers */
export const UPLOAD_IMAGE_COMPRESS_MAX_WIDTH = 2048;
export const UPLOAD_IMAGE_COMPRESS_MAX_HEIGHT = 2048;
export const UPLOAD_IMAGE_COMPRESS_QUALITY = 85;

export const FILE_UPLOAD_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
] as const;
