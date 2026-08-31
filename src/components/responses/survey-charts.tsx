"use client";

import type { ChoiceQuestionSummary } from "@/domain/responses";

const CHART_COLORS = [
  "#0f6e56",
  "#0e7490",
  "#3f6212",
  "#b45309",
  "#57534e",
  "#1b7a4e",
  "#155e75",
  "#92400e",
];

type BarChartProps = {
  summary: ChoiceQuestionSummary;
  maxBarHeight?: number;
};

export function SurveyBarChart({ summary, maxBarHeight = 160 }: BarChartProps) {
  const maxCount = Math.max(...summary.options.map((o) => o.count), 1);

  return (
    <div
      className="flex items-end justify-between gap-2 pt-2"
      role="img"
      aria-label={summary.label}
    >
      {summary.options.map((option, index) => {
        const height = Math.max((option.count / maxCount) * maxBarHeight, 4);
        return (
          <div
            key={option.id}
            className="flex min-w-0 flex-1 flex-col items-center gap-2"
          >
            <span className="text-xs font-medium tabular-nums text-ink-muted">
              {option.count}
            </span>
            <div
              className="w-full max-w-10 rounded-t-md transition-[height] duration-300"
              style={{
                height,
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
              title={`${option.label}: ${option.count} (${option.percent}%)`}
            />
            <span className="w-full truncate text-center text-xs font-medium text-ink">
              {option.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

type DonutChartProps = {
  summary: ChoiceQuestionSummary;
  size?: number;
};

export function SurveyDonutChart({ summary, size = 168 }: DonutChartProps) {
  const total = summary.options.reduce((sum, o) => sum + o.count, 0) || 1;
  const radius = 40;
  const circumference = 2 * Math.PI * radius;

  const [segments] = summary.options.reduce<
    [
      Array<
        (typeof summary.options)[number] & {
          color: string;
          dashArray: string;
          dashOffset: number;
        }
      >,
      number,
    ]
  >(
    ([acc, offset], option, index) => {
      const length = (option.count / total) * circumference;
      acc.push({
        ...option,
        color: CHART_COLORS[index % CHART_COLORS.length]!,
        dashArray: `${length} ${circumference - length}`,
        dashOffset: -offset,
      });
      return [acc, offset + length];
    },
    [[], 0],
  );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-8">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          role="img"
          aria-label={summary.label}
          className="-rotate-90"
        >
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth="14"
          />
          {segments.map((segment) => (
            <circle
              key={segment.id}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth="14"
              strokeDasharray={segment.dashArray}
              strokeDashoffset={segment.dashOffset}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-semibold tabular-nums text-ink">{total}</span>
        </div>
      </div>
      <ul className="space-y-2 text-sm">
        {summary.options.map((option, index) => (
          <li key={option.id} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
              }}
            />
            <span className="min-w-0 flex-1 truncate text-ink">{option.label}</span>
            <span className="shrink-0 tabular-nums text-ink-muted">
              {option.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

type WordCloudProps = {
  words: Array<{ word: string; count: number }>;
};

export function SurveyWordCloud({ words }: WordCloudProps) {
  if (!words.length) return null;
  const max = Math.max(...words.map((w) => w.count), 1);

  return (
    <div
      className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl border border-border/80 bg-bg-elevated px-4 py-6"
      role="list"
      aria-label="Kata kunci"
    >
      {words.map((item) => {
        const scale = 0.75 + (item.count / max) * 0.9;
        return (
          <span
            key={item.word}
            role="listitem"
            className="font-medium text-accent transition-transform hover:scale-105"
            style={{ fontSize: `${scale}rem` }}
            title={`${item.count} kali`}
          >
            {item.word}
          </span>
        );
      })}
    </div>
  );
}
