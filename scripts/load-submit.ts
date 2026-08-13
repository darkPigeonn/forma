/**
 * Concurrent public-submit smoke test.
 *
 * Usage (dev server running):
 *   npx tsx scripts/load-submit.ts --slug=<publicSlugOrShortCode>
 *
 * Optional:
 *   --base=http://localhost:3000
 *   --total=100
 *   --concurrency=25
 *   --questionId=<id>   (defaults to first question as short empty-ok payload may fail validation)
 *
 * The script sends minimal answers; for required fields pass a JSON file:
 *   --answers=scripts/fixtures/demo-answers.json
 *
 * Example answers file:
 *   { "answers": [{ "questionId": "...", "value": "Load test" }] }
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";

type Args = {
  slug: string;
  base: string;
  total: number;
  concurrency: number;
  answersPath?: string;
};

function parseArgs(argv: string[]): Args {
  const out: Args = {
    slug: "",
    base: "http://localhost:3000",
    total: 100,
    concurrency: 25,
  };
  for (const arg of argv) {
    if (arg.startsWith("--slug=")) out.slug = arg.slice("--slug=".length);
    else if (arg.startsWith("--base=")) out.base = arg.slice("--base=".length);
    else if (arg.startsWith("--total="))
      out.total = Math.max(1, Number(arg.slice("--total=".length)) || 100);
    else if (arg.startsWith("--concurrency="))
      out.concurrency = Math.max(
        1,
        Number(arg.slice("--concurrency=".length)) || 25,
      );
    else if (arg.startsWith("--answers="))
      out.answersPath = arg.slice("--answers=".length);
  }
  return out;
}

async function fetchPublicForm(base: string, slug: string) {
  let res: Response;
  try {
    res = await fetch(`${base}/f/${slug}`, { redirect: "follow" });
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? String((error as Error & { cause?: { code?: string } }).cause?.code ?? "")
        : "";
    throw new Error(
      `Cannot reach ${base} (${cause || "connection failed"}).\n` +
        `Start the app first in another terminal: npm run dev\n` +
        `Then re-run this load test.`,
    );
  }
  if (!res.ok) {
    throw new Error(
      `Could not open /f/${slug} (HTTP ${res.status}). Is the form published?`,
    );
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.slug) {
    console.error(
      "Missing --slug=<publicSlugOrShortCode>\n" +
        "Example: npx tsx scripts/load-submit.ts --slug=demo8fmk --total=50 --concurrency=20",
    );
    process.exit(1);
  }

  let body: { answers: Array<{ questionId: string; value: unknown }> };
  if (args.answersPath) {
    const path = resolve(process.cwd(), args.answersPath);
    if (!existsSync(path)) {
      console.error(`Answers file not found: ${path}`);
      process.exit(1);
    }
    body = JSON.parse(readFileSync(path, "utf8")) as typeof body;
  } else {
    console.error(
      "Provide --answers=<json> with valid answers for the form’s required fields.\n" +
        'Example file: { "answers": [{ "questionId": "…", "value": "ok" }] }',
    );
    process.exit(1);
  }

  console.log(
    `Load test → ${args.base}/api/f/${args.slug}/submit` +
      `\n  total=${args.total} concurrency=${args.concurrency}`,
  );

  await fetchPublicForm(args.base, args.slug);

  const url = `${args.base}/api/f/${args.slug}/submit`;
  let nextIndex = 0;
  let ok = 0;
  let fail = 0;
  const statusCounts = new Map<number, number>();
  const started = Date.now();

  async function worker() {
    while (true) {
      const i = nextIndex;
      nextIndex += 1;
      if (i >= args.total) return;

      // Distinct IPs so per-IP limit does not dominate a many-user simulation.
      const fakeIp = `203.0.113.${(i % 250) + 1}`;
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-forwarded-for": fakeIp,
          },
          body: JSON.stringify(body),
        });
        statusCounts.set(res.status, (statusCounts.get(res.status) ?? 0) + 1);
        if (res.ok) ok += 1;
        else fail += 1;
      } catch {
        fail += 1;
        statusCounts.set(0, (statusCounts.get(0) ?? 0) + 1);
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(args.concurrency, args.total) },
    () => worker(),
  );
  await Promise.all(workers);

  const elapsedMs = Date.now() - started;
  const rps = ((args.total / elapsedMs) * 1000).toFixed(1);
  console.log(`Done in ${elapsedMs}ms (~${rps} req/s)`);
  console.log(`  ok=${ok} fail=${fail}`);
  console.log(
    "  status:",
    [...statusCounts.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([code, n]) => `${code}:${n}`)
      .join(" "),
  );

  if (ok < args.total * 0.9) {
    console.error("Fewer than 90% succeeded — check server logs / rate limits / answers.");
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
