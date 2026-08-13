/**
 * Builds scripts/fixtures/load-answers.json from the first published form in MongoDB.
 * Usage: npx tsx scripts/prepare-load-fixture.ts
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvLocal();

type Choice = { id: string; label?: string };
type Question = {
  id: string;
  type: string;
  required?: boolean;
  options?: { choices?: Choice[] };
};

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI");
    process.exit(1);
  }

  await mongoose.connect(uri);
  const form = await mongoose.connection.db!.collection("forms").findOne({
    status: "published",
  });
  if (!form) {
    console.error("No published form found. Publish a form or run npm run seed.");
    process.exit(1);
  }

  const questions = (form.questions ?? []) as Question[];
  const answers = questions
    .map((q) => {
      let value: unknown = null;
      if (q.type === "short_text" || q.type === "long_text") {
        value = `Load test ${Date.now()}`;
      } else if (q.type === "email") {
        value = "load@example.com";
      } else if (q.type === "number") {
        value = 1;
      } else if (q.type === "date") {
        value = "2026-08-13";
      } else if (q.type === "multiple_choice" || q.type === "dropdown") {
        value = q.options?.choices?.[0]?.id ?? null;
      } else if (q.type === "checkboxes") {
        value = (q.options?.choices ?? []).slice(0, 1).map((c) => c.id);
      }
      // skip file_upload in automated load
      return { questionId: q.id, value };
    })
    .filter((a) => a.value !== null && a.value !== undefined);

  const slug = String(form.shortCode || form.slug);
  const dir = resolve(process.cwd(), "scripts/fixtures");
  mkdirSync(dir, { recursive: true });
  const out = resolve(dir, "load-answers.json");
  writeFileSync(out, JSON.stringify({ answers }, null, 2));
  writeFileSync(
    resolve(dir, "load-target.json"),
    JSON.stringify({ slug, title: form.title }, null, 2),
  );

  console.log(`Wrote ${out}`);
  console.log(`Target slug: ${slug}`);
  console.log(`Answers: ${answers.length} (of ${questions.length} questions)`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {
    // ignore
  }
  process.exit(1);
});
