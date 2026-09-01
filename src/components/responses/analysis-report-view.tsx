"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeMarkdownReport } from "@/lib/normalize-markdown-report";

type AnalysisReportViewProps = {
  report: string;
};

const markdownComponents: Components = {
  h2: ({ children }) => (
    <h2 className="mt-8 border-b border-border/80 pb-2 font-[family-name:var(--font-fraunces)] text-lg font-semibold text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-6 font-[family-name:var(--font-fraunces)] text-base font-semibold text-ink">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-[1rem] leading-[1.85] text-ink first:mt-0 text-pretty">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 list-disc space-y-3 pl-5 text-[1rem] leading-[1.8] marker:text-accent">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-3 pl-5 text-[1rem] leading-[1.8]">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-ink [&>p]:mt-0 [&>p]:inline">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-ink">{children}</strong>
  ),
  em: ({ children }) => <em className="italic text-ink-muted">{children}</em>,
  table: ({ children }) => (
    <div className="mt-4 overflow-x-auto rounded-lg border border-border bg-bg-elevated shadow-sm shadow-black/[0.02]">
      <table className="min-w-full border-collapse text-left text-[0.875rem]">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="border-b border-border bg-bg">{children}</thead>
  ),
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border/70 last:border-b-0 even:bg-bg/40">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3 font-semibold text-ink"
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 align-top text-ink-muted first:font-medium first:text-ink">
      {children}
    </td>
  ),
  hr: () => <hr className="my-6 border-border" />,
  blockquote: ({ children }) => (
    <blockquote className="mt-4 border-l-4 border-accent/40 pl-4 text-[0.9375rem] italic leading-relaxed text-ink-muted">
      {children}
    </blockquote>
  ),
};

export function AnalysisReportView({ report }: AnalysisReportViewProps) {
  const markdown = normalizeMarkdownReport(report);

  return (
    <article
      className="analysis-report-markdown mt-5 w-full max-w-none font-[family-name:var(--font-source-sans-3)] text-base text-ink"
      aria-label="Laporan wawasan AI"
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
