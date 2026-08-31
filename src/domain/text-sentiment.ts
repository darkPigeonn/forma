export type TextSentiment = "positive" | "neutral" | "negative";

const POSITIVE = [
  "baik",
  "bagus",
  "senang",
  "terima kasih",
  "mendukung",
  "aktif",
  "positif",
  "harmonis",
  "meningkat",
  "nyaman",
  "semangat",
  "bermanfaat",
  "sukses",
  "berkah",
];

const NEGATIVE = [
  "sulit",
  "kurang",
  "buruk",
  "jarang",
  "rendah",
  "masalah",
  "kecewa",
  "lemah",
  "tidak",
  "belum",
  "terbatas",
  "kurangnya",
  "lemot",
  "buruknya",
];

const STOPWORDS = new Set([
  "yang",
  "dan",
  "di",
  "ke",
  "dari",
  "untuk",
  "dengan",
  "pada",
  "ini",
  "itu",
  "ada",
  "saya",
  "kami",
  "kita",
  "akan",
  "bisa",
  "lebih",
  "juga",
  "atau",
  "agar",
  "supaya",
  "dalam",
  "saat",
  "masih",
  "sudah",
  "belum",
  "the",
  "a",
  "an",
]);

export function analyzeSentiment(text: string): TextSentiment {
  const lower = text.toLowerCase();
  let positive = 0;
  let negative = 0;
  for (const word of POSITIVE) {
    if (lower.includes(word)) positive += 1;
  }
  for (const word of NEGATIVE) {
    if (lower.includes(word)) negative += 1;
  }
  if (positive > negative) return "positive";
  if (negative > positive) return "negative";
  return "neutral";
}

export function extractTopWords(
  texts: string[],
  limit = 14,
): Array<{ word: string; count: number }> {
  const counts = new Map<string, number>();
  for (const text of texts) {
    const tokens = text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token));
    for (const token of tokens) {
      counts.set(token, (counts.get(token) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}
