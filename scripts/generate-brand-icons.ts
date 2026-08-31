/**
 * Regenerates transparent logo + app icons from public/logo.jpeg.
 * Run: npx tsx scripts/generate-brand-icons.ts
 */
import { writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import toIco from "to-ico";

const ROOT = process.cwd();
const SOURCE = path.join(ROOT, "public", "logo.jpeg");
const WHITE_THRESHOLD = 240;

function keyWhiteToAlpha(raw: Buffer, channels: number): Buffer {
  const out = Buffer.from(raw);
  for (let i = 0; i < out.length; i += channels) {
    const r = out[i]!;
    const g = out[i + 1]!;
    const b = out[i + 2]!;
    if (r >= WHITE_THRESHOLD && g >= WHITE_THRESHOLD && b >= WHITE_THRESHOLD) {
      out[i + 3] = 0;
    }
  }
  return out;
}

async function transparentPngBuffer(): Promise<Buffer> {
  const { data, info } = await sharp(SOURCE)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const keyed = keyWhiteToAlpha(data, info.channels);
  return sharp(keyed, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function resizeLogo(
  source: Buffer,
  size: number,
): Promise<Buffer> {
  return sharp(source)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const master = await transparentPngBuffer();

  const logo512 = await resizeLogo(master, 512);
  writeFileSync(path.join(ROOT, "public", "logo.png"), logo512);

  const icon32 = await resizeLogo(logo512, 32);
  const icon48 = await resizeLogo(logo512, 48);
  const icon96 = await resizeLogo(logo512, 96);
  const icon180 = await resizeLogo(logo512, 180);

  writeFileSync(path.join(ROOT, "src", "app", "icon.png"), icon96);
  writeFileSync(path.join(ROOT, "src", "app", "apple-icon.png"), icon180);

  const favicon = await toIco([icon32, icon48]);
  writeFileSync(path.join(ROOT, "src", "app", "favicon.ico"), favicon);

  console.log("Generated public/logo.png, src/app/icon.png, apple-icon.png, favicon.ico");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
