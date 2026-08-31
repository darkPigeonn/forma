import type { ReactNode } from "react";

export const formQuestionCardClass =
  "rounded-lg border border-border bg-bg-elevated p-5 sm:p-6";

type FormQuestionCardProps = {
  children: ReactNode;
};

export function FormQuestionCard({ children }: FormQuestionCardProps) {
  return <article className={formQuestionCardClass}>{children}</article>;
}
