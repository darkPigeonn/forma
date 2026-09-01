/**
 * Fixes response indexes and legacy null meta fields that block repeat submits
 * when "Batasi 1 respons" is off.
 *
 * Run once after deploy: npm run migrate:response-indexes
 * Loads variables from `.env.local` when present.
 */
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import mongoose from "mongoose";

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

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("Missing MONGODB_URI (set env or add to .env.local)");
    process.exit(1);
  }
  return uri;
}

async function dropUniqueIndex(
  collection: mongoose.mongo.Collection,
  field: "meta.respondentEmail" | "meta.respondentKey" | "meta.uniqueKey",
) {
  const indexes = await collection.indexes();
  const legacy = indexes.find(
    (idx) => idx.unique === true && idx.key?.formId === 1 && idx.key?.[field] === 1,
  );
  if (legacy?.name) {
    await collection.dropIndex(legacy.name);
    console.log(`Dropped legacy unique index: ${legacy.name}`);
  }
}

async function main() {
  await mongoose.connect(getMongoUri());
  const collection = mongoose.connection.collection("responses");

  await dropUniqueIndex(collection, "meta.respondentEmail");

  await collection.createIndex(
    { formId: 1, "meta.respondentEmail": 1 },
    { sparse: true, name: "formId_1_meta.respondentEmail_1" },
  );
  console.log("Ensured non-unique sparse index on meta.respondentEmail.");

  // Backfill legacy null keys so sparse unique indexes do not block new submits.
  const nullKeys = await collection
    .find({ "meta.respondentKey": null })
    .project({ submittedAt: 1 })
    .toArray();
  for (const doc of nullKeys) {
    const ts =
      doc.submittedAt instanceof Date
        ? doc.submittedAt.getTime()
        : Date.now();
    await collection.updateOne(
      { _id: doc._id },
      { $set: { "meta.respondentKey": `open:${ts}:migrated` } },
    );
  }
  if (nullKeys.length > 0) {
    console.log(`Backfilled meta.respondentKey on ${nullKeys.length} response(s).`);
  }

  const nullUniqueKeys = await collection
    .find({ "meta.uniqueKey": null })
    .project({ submittedAt: 1 })
    .toArray();
  for (const doc of nullUniqueKeys) {
    const ts =
      doc.submittedAt instanceof Date
        ? doc.submittedAt.getTime()
        : Date.now();
    await collection.updateOne(
      { _id: doc._id },
      { $set: { "meta.uniqueKey": `uniq:${ts}:migrated` } },
    );
  }
  if (nullUniqueKeys.length > 0) {
    console.log(`Backfilled meta.uniqueKey on ${nullUniqueKeys.length} response(s).`);
  }

  for (const field of ["meta.respondentEmail"] as const) {
    const result = await collection.updateMany(
      { [field]: null },
      { $unset: { [field]: "" } },
    );
    if (result.modifiedCount > 0) {
      console.log(`Unset ${field}=null on ${result.modifiedCount} response(s).`);
    }
  }

  await mongoose.disconnect();
  console.log("Migration complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
