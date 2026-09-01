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

const WORD_CLOUD_COLORS = [
  "#0f6e56",
  "#0b5a46",
  "#0e7490",
  "#155e75",
  "#3f6212",
  "#1b7a4e",
  "#b45309",
  "#57534e",
];

function hashWord(word: string): number {
  let hash = 0;
  for (let i = 0; i < word.length; i += 1) {
    hash = (hash << 5) - hash + word.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function spiralPosition(index: number): { x: number; y: number } {
  if (index === 0) return { x: 50, y: 50 };
  const goldenAngle = 2.399963229728653;
  const angle = index * goldenAngle;
  const radius = 12 + Math.sqrt(index) * 10;
  return {
    x: 50 + radius * Math.cos(angle),
    y: 50 + radius * Math.sin(angle),
  };
}

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

  const sorted = [...words].sort((a, b) => b.count - a.count);
  const max = Math.max(...sorted.map((w) => w.count), 1);

  return (
    <div
      className="relative min-h-[13rem] overflow-hidden rounded-2xl border border-border/80 sm:min-h-[15rem]"
      role="img"
      aria-label="Kata kunci dari jawaban responden"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 85% 70% at 18% 12%, rgba(15, 110, 86, 0.14), transparent 55%), radial-gradient(ellipse 70% 55% at 88% 78%, rgba(14, 116, 144, 0.1), transparent 50%), linear-gradient(165deg, var(--color-bg-elevated) 0%, color-mix(in srgb, var(--color-bg) 88%, white) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute -left-8 top-6 h-28 w-28 rounded-full bg-accent/10 blur-2xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-6 right-4 h-32 w-32 rounded-full bg-[#0e7490]/10 blur-2xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto h-full min-h-[13rem] w-full max-w-2xl sm:min-h-[15rem]">
        {sorted.map((item, index) => {
          const ratio = item.count / max;
          const fontSize = 0.8 + ratio * 1.65;
          const weight = ratio > 0.66 ? 700 : ratio > 0.33 ? 600 : 500;
          const color = WORD_CLOUD_COLORS[hashWord(item.word) % WORD_CLOUD_COLORS.length]!;
          const rotation = ((hashWord(item.word) % 17) - 8) * (index === 0 ? 0 : 1);
          const { x, y } = spiralPosition(index);
          const isHero = index === 0;

          return (
            <span
              key={item.word}
              className="motion-word-pop group absolute max-w-[42%] -translate-x-1/2 -translate-y-1/2 cursor-default select-none text-center leading-tight"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                zIndex: Math.round(ratio * 10) + (isHero ? 10 : 0),
                animationDelay: `${index * 45}ms`,
              }}
              title={`${item.word}: ${item.count} kali`}
            >
              <span
                className={`relative inline-block px-0.5 transition-transform duration-200 group-hover:scale-110 ${
                  isHero
                    ? "font-[family-name:var(--font-fraunces)] tracking-tight"
                    : "font-[family-name:var(--font-source-sans)]"
                }`}
                style={{
                  fontSize: `${fontSize}rem`,
                  fontWeight: weight,
                  color,
                  transform: `rotate(${rotation}deg)`,
                  textShadow: isHero
                    ? "0 1px 0 rgba(255,255,255,0.85), 0 8px 24px rgba(15, 110, 86, 0.12)"
                    : "0 1px 0 rgba(255,255,255,0.7)",
                }}
              >
                {item.word}
                <span
                  className="pointer-events-none absolute -bottom-4 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-full bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-bg-elevated opacity-0 shadow-sm transition-opacity group-hover:opacity-100 sm:block"
                  aria-hidden="true"
                >
                  {item.count}×
                </span>
              </span>
            </span>
          );
        })}
      </div>

      <ul className="sr-only">
        {sorted.map((item) => (
          <li key={item.word}>
            {item.word}: {item.count}
          </li>
        ))}
      </ul>
    </div>
  );
}
