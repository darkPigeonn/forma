/**
 * Seed survei partisipasi lingkungan + random responses.
 *
 * Usage:
 *   npx tsx scripts/seed-lingkungan-survey.ts
 *
 * Optional:
 *   SEED_OWNER_NAME="Atanasius Ivannoel Rio Aji"
 *   SEED_RESPONSE_COUNT=757
 *   SEED_FORM_SLUG=survei-partisipasi-lingkungan
 *   SEED_RESPONSES_ONLY=1   — keep existing form/questions, only replace responses
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import mongoose, { Types } from "mongoose";
import { createId } from "@paralleldrive/cuid2";

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
    value = value.replace(/\\n/g, "\n");
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvLocal();

const MONGODB_URI = process.env.MONGODB_URI;
const SEED_OWNER_NAME =
  process.env.SEED_OWNER_NAME ?? "Atanasius Ivannoel Rio Aji";
const SEED_RESPONSE_COUNT = Number(process.env.SEED_RESPONSE_COUNT ?? "757");
const SEED_FORM_SLUG =
  process.env.SEED_FORM_SLUG ?? "survei-partisipasi-lingkungan";
const SEED_RESPONSES_ONLY =
  process.env.SEED_RESPONSES_ONLY === "1" ||
  process.env.SEED_RESPONSES_ONLY === "true";
const SHORT_LINK_ALPHABET = "23456789abcdefghjkmnpqrstuvwxyz";

type SeedQuestion = {
  id: string;
  type: string;
  label: string;
  helpText?: string;
  required: boolean;
  order: number;
  sectionId: string;
  options?: {
    choices?: Array<{ id: string; label: string }>;
    range?: { min: number; max: number; minLabel?: string; maxLabel?: string };
  };
};

if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI");
  process.exit(1);
}

function makeShortLinkCode(length = 8): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += SHORT_LINK_ALPHABET[bytes[i]! % SHORT_LINK_ALPHABET.length];
  }
  return out;
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function weightedScore(min = 1, max = 10): number {
  const roll = Math.random();
  let raw: number;
  if (roll < 0.05) raw = pick([1, 2, 3]);
  else if (roll < 0.15) raw = pick([4, 5]);
  else if (roll < 0.55) raw = pick([6, 7, 8]);
  else if (roll < 0.85) raw = pick([8, 9]);
  else raw = pick([9, 10]);
  return Math.min(max, Math.max(min, raw));
}

const REASONS_LOW = [
  "Jadwal kerja padat sehingga sulit hadir rutin di kegiatan lingkungan.",
  "Belum banyak mengenal warga lain, jadi belum merasa nyaman ikut acara.",
  "Keluarga masih kecil dan banyak urusan di rumah.",
  "Kondisi kesehatan belum memungkinkan untuk aktif di luar rumah.",
  "Tidak banyak mendapat informasi tentang jadwal kegiatan lingkungan.",
];

const REASONS_MID = [
  "Saya ikut beberapa kegiatan, tetapi belum konsisten setiap bulan.",
  "Aktif di lingkungan saat ada acara besar, untuk rutinan masih terbatas.",
  "Sudah berusaha hadir, namun masih ada kendala waktu di akhir pekan.",
  "Partisipasi saya cukup, tetapi bisa lebih baik dengan perencanaan waktu.",
  "Saya membantu saat dibutuhkan, meski belum menjadi pengurus.",
];

const REASONS_HIGH = [
  "Saya rutin hadir di misi lingkungan dan ikut koordinasi kegiatan.",
  "Aktif mengajak keluarga ikut acara rohani dan sosial di lingkungan.",
  "Sering membantu persiapan acara dan pendampingan umat baru.",
  "Merasa terpanggil untuk melayani dan menjaga kebersamaan warga.",
  "Sudah lama tinggal di lingkungan ini dan ingin tetap terlibat.",
];

const HARAPAN_LINGKUNGAN = [
  "Semoga kegiatan lingkungan lebih terjadwal dan diinformasikan lebih awal.",
  "Perlu lebih banyak kegiatan yang melibatkan keluarga muda dan anak-anak.",
  "Koordinasi antar blok bisa diperkuat agar partisipasi merata.",
  "Kegiatan sosial seperti kunjungan ke rumah sakit atau lansia ditambah.",
  "Semoga ada pelatihan singkat untuk pengurus dan relawan baru.",
  "Perlu pendekatan personal agar warga yang jarang hadir ikut terlibat.",
  "Kegiatan lingkungan bisa lebih variatif, tidak hanya rapat rutin.",
  "Semoga ada dokumentasi dan evaluasi setelah setiap kegiatan.",
];

const HARAPAN_GEREJA = [
  "Semoga Gereja Roh Kudus semakin dekat dengan umat di tingkat lingkungan.",
  "Perlu penguatan materi katekese dan pembinaan untuk keluarga muda.",
  "Semoga liturgi dan pelayanan pastoral tetap relevan dengan kebutuhan umat.",
  "Harap ada lebih banyak kegiatan rohani yang ramah bagi pekerja sibuk.",
  "Semoga komunikasi antara paroki dan lingkungan lebih lancar.",
  "Perlu dukungan pastor dan rohaniwan untuk mendampingi kegiatan lingkungan.",
  "Semoga Gereja terus menjadi rumah bagi semua umat tanpa terkecuali.",
];

function reasonForScore(score: number): string {
  if (score <= 4) return pick(REASONS_LOW);
  if (score <= 7) return pick(REASONS_MID);
  return pick(REASONS_HIGH);
}

function randomSubmittedAt(index: number, total: number): Date {
  const daysBack = 45;
  const start = Date.now() - daysBack * 24 * 60 * 60 * 1000;
  const spread = (index / Math.max(total - 1, 1)) * daysBack * 24 * 60 * 60 * 1000;
  const jitter = (Math.random() - 0.5) * 6 * 60 * 60 * 1000;
  return new Date(start + spread + jitter);
}

function buildDefaultQuestions(sectionId: string): SeedQuestion[] {
  const qScore = createId();
  const qReason = createId();
  const qHopeLingkungan = createId();
  const qHopeGereja = createId();

  return [
    {
      id: qScore,
      type: "range",
      label:
        "Dari 1 - 10, berapa Anda menilai tingkat keaktifan dan partisipasi Anda sendiri dalam kegiatan-kegiatan di lingkungan Anda? (1 paling rendah - 10 paling tinggi)",
      helpText: "Pilih angka 1 (paling rendah) hingga 10 (paling tinggi).",
      required: true,
      order: 0,
      sectionId,
      options: {
        range: { min: 1, max: 10, minLabel: "", maxLabel: "" },
      },
    },
    {
      id: qReason,
      type: "long_text",
      label: "Mengapa Anda menilai diri Anda demikian?",
      helpText: "",
      required: false,
      order: 1,
      sectionId,
    },
    {
      id: qHopeLingkungan,
      type: "long_text",
      label: "Apa harapan/masukan Anda untuk kegiatan di lingkungan Anda?",
      helpText: "",
      required: true,
      order: 2,
      sectionId,
    },
    {
      id: qHopeGereja,
      type: "long_text",
      label: "Apa harapan/masukan Anda untuk Gereja Roh Kudus?",
      helpText: "",
      required: false,
      order: 3,
      sectionId,
    },
  ];
}

function sortedQuestions(questions: SeedQuestion[]): SeedQuestion[] {
  return [...questions].sort((a, b) => a.order - b.order);
}

function resolveQuestionSet(questions: SeedQuestion[]) {
  const ordered = sortedQuestions(questions);
  const qScore =
    ordered.find((q) => q.type === "range") ??
    ordered.find((q) => q.order === 0);
  const textQuestions = ordered.filter((q) => q.type === "long_text");
  const qReason = textQuestions[0];
  const qHopeLingkungan = textQuestions[1];
  const qHopeGereja = textQuestions[2];

  if (!qScore || qScore.type !== "range") {
    throw new Error(
      "Form survei lingkungan harus punya pertanyaan skala (tipe range) di posisi pertama.",
    );
  }
  if (!qReason || !qHopeLingkungan) {
    throw new Error("Form survei lingkungan tidak memiliki pertanyaan teks yang diharapkan.");
  }

  const range = qScore.options?.range ?? { min: 1, max: 10 };
  return {
    qScore,
    qReason,
    qHopeLingkungan,
    qHopeGereja,
    rangeMin: range.min ?? 1,
    rangeMax: range.max ?? 10,
  };
}

async function resolveOwner(users: mongoose.mongo.Collection) {
  const exact = await users.findOne({
    name: {
      $regex: new RegExp(
        `^${SEED_OWNER_NAME.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "i",
      ),
    },
  });
  if (exact?.firebaseUid) return exact;

  const partial = await users.findOne({
    $or: [
      { name: { $regex: /Atanasius/i } },
      { name: { $regex: /Ivannoel/i } },
      { name: { $regex: /Rio Aji/i } },
      { email: { $regex: /atanasius|ivannoel/i } },
    ],
  });
  if (partial?.firebaseUid) return partial;

  if (process.env.SEED_OWNER_UID) {
    const byUid = await users.findOne({
      firebaseUid: process.env.SEED_OWNER_UID,
    });
    if (byUid?.firebaseUid) return byUid;
  }

  const available = await users
    .find({}, { projection: { firebaseUid: 1, email: 1, name: 1 } })
    .limit(10)
    .toArray();

  console.error(`User not found: ${SEED_OWNER_NAME}`);
  if (available.length) {
    console.error("Available users:");
    for (const user of available) {
      console.error(
        `  - ${user.name ?? "(no name)"} <${user.email ?? "no email"}> uid=${user.firebaseUid}`,
      );
    }
    console.error("Set SEED_OWNER_UID in .env.local or adjust SEED_OWNER_NAME.");
  } else {
    console.error("No users in MongoDB yet. Sign in once, then re-run.");
  }
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI!);
  const db = mongoose.connection.db;
  if (!db) throw new Error("No database connection");

  const users = db.collection("users");
  const forms = db.collection("forms");
  const responses = db.collection("responses");

  const owner = await resolveOwner(users);
  const ownerId = String(owner.firebaseUid);
  const now = new Date();

  let formDoc = await forms.findOne({ ownerId, slug: SEED_FORM_SLUG });

  if (!formDoc) {
    const sectionId = createId();
    const questions = buildDefaultQuestions(sectionId);
    const shortCode = makeShortLinkCode();
    formDoc = await forms.findOneAndUpdate(
      { ownerId, slug: SEED_FORM_SLUG },
      {
        $set: {
          ownerId,
          title: "Survei Partisipasi Lingkungan",
          description:
            "Survei penilaian keaktifan dan harapan umat di lingkungan serta Gereja Roh Kudus.",
          slug: SEED_FORM_SLUG,
          shortCode,
          status: "published",
          confirmationMessage:
            "Terima kasih atas partisipasi Anda. Masukan Anda sangat berarti bagi kami.",
          themeId: "teal",
          limitOneResponse: false,
          questions,
          sections: [
            {
              id: sectionId,
              title: "",
              description: "",
              order: 0,
            },
          ],
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    console.log("Created form with range question.");
  } else if (SEED_RESPONSES_ONLY) {
    console.log("Keeping existing form and questions (SEED_RESPONSES_ONLY).");
  } else {
    const sectionId =
      formDoc.sections?.[0]?.id ?? createId();
    const questions = buildDefaultQuestions(sectionId);
    await forms.updateOne(
      { _id: formDoc._id },
      {
        $set: {
          questions,
          sections: formDoc.sections?.length
            ? formDoc.sections
            : [
                {
                  id: sectionId,
                  title: "",
                  description: "",
                  order: 0,
                },
              ],
          updatedAt: now,
        },
      },
    );
    formDoc = await forms.findOne({ _id: formDoc._id });
    console.log("Updated form questions (Q1 = range).");
  }

  if (!formDoc?._id) throw new Error("Failed to load form");

  const formId = formDoc._id;
  const questionSet = resolveQuestionSet(
    (formDoc.questions ?? []) as SeedQuestion[],
  );

  const deleteResult = await responses.deleteMany({ formId });
  if (deleteResult.deletedCount > 0) {
    console.log(`Removed ${deleteResult.deletedCount} existing responses.`);
  }

  const docs = Array.from({ length: SEED_RESPONSE_COUNT }, (_, index) => {
    const score = weightedScore(questionSet.rangeMin, questionSet.rangeMax);
    const answers: Array<{ questionId: string; value: string | number }> = [
      { questionId: questionSet.qScore.id, value: score },
      { questionId: questionSet.qReason.id, value: reasonForScore(score) },
      {
        questionId: questionSet.qHopeLingkungan.id,
        value: pick(HARAPAN_LINGKUNGAN),
      },
    ];
    if (questionSet.qHopeGereja && Math.random() > 0.12) {
      answers.push({
        questionId: questionSet.qHopeGereja.id,
        value: pick(HARAPAN_GEREJA),
      });
    }

    return {
      formId: new Types.ObjectId(String(formId)),
      submittedAt: randomSubmittedAt(index, SEED_RESPONSE_COUNT),
      meta: {
        respondentKey: `seed-lingkungan-${index}`,
        uniqueKey: `seed-lingkungan-${index}`,
      },
      answers,
    };
  });

  const batchSize = 100;
  for (let i = 0; i < docs.length; i += batchSize) {
    await responses.insertMany(docs.slice(i, i + batchSize));
  }

  const shortCode = formDoc.shortCode ?? makeShortLinkCode();
  console.log("Seed complete.");
  console.log(`  Owner:     ${owner.name ?? SEED_OWNER_NAME}`);
  console.log(`  Owner UID: ${ownerId}`);
  console.log(`  Form id:   ${String(formId)}`);
  console.log(`  Responses: ${SEED_RESPONSE_COUNT}`);
  console.log(`  Q1 type:   ${questionSet.qScore.type} (${questionSet.rangeMin}-${questionSet.rangeMax})`);
  console.log(`  Public:    /f/${shortCode} (also /f/${SEED_FORM_SLUG})`);
  console.log(`  Editor:    /forms/${String(formId)}`);

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
