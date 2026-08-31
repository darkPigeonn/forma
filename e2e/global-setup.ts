import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

const E2E_OWNER_ID = "e2e-test-owner";
const E2E_SLUG = "e2e-fixture";
const E2E_SECTION_ID = "e2e-section";
const E2E_QUESTION_ID = "e2e-question-name";

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

function writeFixture(data: Record<string, unknown>) {
  const dir = resolve(process.cwd(), "e2e");
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, ".fixture.json"), JSON.stringify(data, null, 2));
}

export default async function globalSetup() {
  loadEnvLocal();

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    writeFixture({
      skip: true,
      reason: "MONGODB_URI is not set",
    });
    return;
  }

  await mongoose.connect(uri);
  const forms = mongoose.connection.db!.collection("forms");
  const responses = mongoose.connection.db!.collection("responses");

  await forms.updateOne(
    { slug: E2E_SLUG },
    {
      $set: {
        ownerId: E2E_OWNER_ID,
        title: "Survei E2E",
        description: "Fixture for Playwright smoke tests",
        status: "published",
        slug: E2E_SLUG,
        shortCode: E2E_SLUG,
        confirmationMessage: "Terima kasih — respons Anda sudah dikirim.",
        themeId: "teal",
        limitOneResponse: false,
        uniqueBy: "browser",
        uniqueQuestionId: null,
        headerImage: null,
        sections: [
          {
            id: E2E_SECTION_ID,
            title: "",
            description: "",
            order: 0,
          },
        ],
        questions: [
          {
            id: E2E_QUESTION_ID,
            type: "short_text",
            label: "Nama",
            helpText: "",
            required: true,
            order: 0,
            sectionId: E2E_SECTION_ID,
          },
        ],
        updatedAt: new Date(),
      },
      $setOnInsert: {
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );

  const form = await forms.findOne({ slug: E2E_SLUG });
  if (form?._id) {
    await responses.deleteMany({ formId: form._id });
  }

  await mongoose.disconnect();

  writeFixture({
    skip: false,
    slug: E2E_SLUG,
    questionId: E2E_QUESTION_ID,
    questionLabel: "Nama",
    submitLabel: "Kirim",
    successText: "Respons tercatat",
  });
}
