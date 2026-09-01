/** Max regenerate clicks after the first AI insight for a response snapshot. */
export const MAX_AI_REGENERATIONS = 3;

export function remainingAiRegenerations(regenerationCount: number): number {
  return Math.max(0, MAX_AI_REGENERATIONS - regenerationCount);
}

export function canRegenerateAiInsights(regenerationCount: number): boolean {
  return regenerationCount < MAX_AI_REGENERATIONS;
}
