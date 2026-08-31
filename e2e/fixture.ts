import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export type E2EFixture = {
  skip: boolean;
  reason?: string;
  slug?: string;
  questionId?: string;
  questionLabel?: string;
  submitLabel?: string;
  successText?: string;
};

export function readE2EFixture(): E2EFixture {
  const path = resolve(process.cwd(), "e2e/.fixture.json");
  if (!existsSync(path)) {
    return { skip: true, reason: "E2E fixture file missing" };
  }
  return JSON.parse(readFileSync(path, "utf8")) as E2EFixture;
}
