/**
 * Drops the legacy unique index on responses.meta.respondentEmail so the same
 * Google email can submit multiple times when "Batasi 1 respons" is off.
 *
 * Run once after deploy: npm run migrate:response-indexes
 */
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const collection = mongoose.connection.collection("responses");

  const indexes = await collection.indexes();
  const legacy = indexes.find(
    (idx) =>
      idx.unique === true &&
      idx.key?.formId === 1 &&
      idx.key?.["meta.respondentEmail"] === 1,
  );

  if (legacy?.name) {
    await collection.dropIndex(legacy.name);
    console.log(`Dropped legacy index: ${legacy.name}`);
  } else {
    console.log("No legacy unique index on meta.respondentEmail — nothing to drop.");
  }

  await collection.createIndex(
    { formId: 1, "meta.respondentEmail": 1 },
    { sparse: true, name: "formId_1_meta.respondentEmail_1" },
  );
  console.log("Ensured non-unique sparse index on meta.respondentEmail.");

  await mongoose.disconnect();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
