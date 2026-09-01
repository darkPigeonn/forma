/** Strip optional ```markdown fences that models sometimes wrap around the full report. */
export function normalizeMarkdownReport(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:markdown|md)?\s*\n([\s\S]*?)\n```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}
