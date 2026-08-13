export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "multiple_choice",
  "checkboxes",
  "dropdown",
  "email",
  "number",
  "date",
  "file_upload",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const FORM_STATUSES = ["draft", "published", "closed"] as const;
export type FormStatus = (typeof FORM_STATUSES)[number];

/** Max upload size for file_upload answers (bytes) */
export const FILE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

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
