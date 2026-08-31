/** Shared typography scale for public form fill + preview. */
export const formFillTypography = {
  title:
    "font-[family-name:var(--font-fraunces)] text-2xl font-semibold leading-tight text-ink sm:text-3xl",
  lead: "text-base leading-relaxed text-ink-muted",
  sectionTitle:
    "font-[family-name:var(--font-fraunces)] text-xl font-semibold leading-snug text-ink",
  meta: "text-sm text-ink-muted",
  questionLabel: "block text-base font-medium leading-snug text-ink",
  questionHelp: "text-sm leading-relaxed text-ink-muted",
  field:
    "w-full rounded-md border border-border bg-bg-elevated px-3 text-base text-ink",
  fieldDisabled:
    "disabled:cursor-not-allowed disabled:opacity-80",
  choiceOption: "flex min-h-11 items-center gap-2.5 text-base leading-snug",
  button: "text-base font-medium",
  error: "text-sm text-danger",
  hint: "text-sm text-ink-muted",
} as const;
