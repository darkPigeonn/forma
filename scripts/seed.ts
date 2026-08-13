/**
 * Seed a demo form for local development.
 *
 * Usage:
 *   SEED_OWNER_UID=<your-firebase-uid> npm run seed
 *
 * Optional:
 *   SEED_OWNER_EMAIL=you@example.com
 *   SEED_OWNER_NAME=Demo Owner
 *
 * Loads variables from `.env.local` when present.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";
import { createId } from "@paralleldrive/cuid2";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
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
    value = value.replace(/\\n/g, "\n");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
let SEED_OWNER_UID = process.env.SEED_OWNER_UID;
const SEED_OWNER_EMAIL =
  process.env.SEED_OWNER_EMAIL ?? "demo@forma.local";
const SEED_OWNER_NAME = process.env.SEED_OWNER_NAME ?? "Demo Owner";
const SEED_SLUG = process.env.SEED_SLUG ?? "demo-feedback";

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

async function resolveOwnerUid(): Promise<{
  uid: string;
  email?: string;
  name?: string;
}> {
  if (SEED_OWNER_UID) {
    return { uid: SEED_OWNER_UID };
  }

  await mongoose.connect(MONGODB_URI!);
  const users = mongoose.connection.db!.collection("users");
  const list = await users
    .find({}, { projection: { firebaseUid: 1, email: 1, name: 1 } })
    .limit(10)
    .toArray();

  if (list.length === 0) {
    console.error(
      "No SEED_OWNER_UID and no users in MongoDB yet.\n" +
        "1. Run npm run dev, open /signup, create an account\n" +
        "2. Re-run: npm run seed\n" +
        "   (or set SEED_OWNER_UID=<firebase-uid> in .env.local)",
    );
    process.exit(1);
  }

  if (list.length === 1) {
    const only = list[0]!;
    console.log(
      `SEED_OWNER_UID not set — using the only user: ${only.email ?? only.firebaseUid}`,
    );
    return {
      uid: String(only.firebaseUid),
      email: only.email ? String(only.email) : undefined,
      name: only.name ? String(only.name) : undefined,
    };
  }

  console.error(
    "SEED_OWNER_UID not set and multiple users exist. Add one to .env.local:\n",
  );
  for (const u of list) {
    console.error(`  SEED_OWNER_UID=${u.firebaseUid}  # ${u.email ?? u.name ?? ""}`);
  }
  process.exit(1);
}

const choice = (label: string) => ({ id: createId(), label });

async function main() {
  const owner = await resolveOwnerUid();
  SEED_OWNER_UID = owner.uid;
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? owner.email ?? SEED_OWNER_EMAIL;
  const ownerName = process.env.SEED_OWNER_NAME ?? owner.name ?? SEED_OWNER_NAME;

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI!);
  }
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const users = db.collection("users");
  const forms = db.collection("forms");

  await users.updateOne(
    { firebaseUid: SEED_OWNER_UID },
    {
      $set: {
        firebaseUid: SEED_OWNER_UID,
        email: ownerEmail,
        name: ownerName,
        updatedAt: new Date(),
      },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  const questions = [
    {
      id: createId(),
      type: "short_text",
      label: "Your name",
      helpText: "",
      required: true,
      order: 0,
    },
    {
      id: createId(),
      type: "email",
      label: "Email",
      helpText: "We'll only use this to follow up if needed.",
      required: true,
      order: 1,
    },
    {
      id: createId(),
      type: "multiple_choice",
      label: "How was your experience?",
      helpText: "",
      required: true,
      order: 2,
      options: {
        choices: [choice("Great"), choice("Okay"), choice("Needs work")],
      },
    },
    {
      id: createId(),
      type: "checkboxes",
      label: "What did you use Forma for?",
      helpText: "Select all that apply",
      required: false,
      order: 3,
      options: {
        choices: [
          choice("Event RSVP"),
          choice("Feedback"),
          choice("Registration"),
          choice("Other"),
        ],
      },
    },
    {
      id: createId(),
      type: "long_text",
      label: "Anything else you'd like to share?",
      helpText: "",
      required: false,
      order: 4,
    },
  ];

  const now = new Date();
  const result = await forms.findOneAndUpdate(
    { ownerId: SEED_OWNER_UID, slug: SEED_SLUG },
    {
      $set: {
        ownerId: SEED_OWNER_UID,
        title: "Demo feedback form",
        description:
          "Sample form seeded for local testing. Edit or publish as you like.",
        slug: SEED_SLUG,
        shortCode: "demo8fmk",
        status: "published",
        confirmationMessage: "Thanks for trying Forma — your feedback is in.",
        questions,
        updatedAt: now,
      },
      $setOnInsert: { createdAt: now },
    },
    { upsert: true, returnDocument: "after" },
  );

  const formId = result?._id?.toString() ?? "(unknown)";
  console.log("Seed complete.");
  console.log(`  Owner UID: ${SEED_OWNER_UID}`);
  console.log(`  Form id:   ${formId}`);
  console.log(`  Public:    /f/demo8fmk (also /f/${SEED_SLUG})`);
  console.log(`  Editor:    /forms/${formId}`);

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
