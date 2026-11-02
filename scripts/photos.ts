// Turns a folder of photos into an album: resizes them to WebP, removes all
// metadata (including GPS), stores them, and writes src/content/photos/<album>.yaml.
//
//   npm run photos -- ./inbox/kyoto --album kyoto --title "Kyoto" --date 2026-04
//
// Files go to Cloudflare R2 when the R2_* variables are set, or to public/photos.
// Running it again keeps existing alt text and adds any new photos to the album.

import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { parse, stringify } from "yaml";

const SIZES = { thumb: 800, full: 2000 } as const;
const INPUT_TYPES = new Set([".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff", ".avif"]);

type Photo = { id: string; alt: string; thumb: string; full: string; width: number; height: number };
type Store = (key: string, body: Buffer) => Promise<string>;

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

function localStore(): Store {
  return async (key, body) => {
    const file = path.join("public/photos", key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, body);
    return `/photos/${key}`;
  };
}

async function r2Store(): Promise<Store> {
  const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } = process.env;
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_PUBLIC_URL) {
    fail("Set all of the R2_* variables in .env, or none of them to store photos locally.");
  }
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
  });
  return async (key, body) => {
    await client.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000",
      }),
    );
    return `${R2_PUBLIC_URL.replace(/\/$/, "")}/${key}`;
  };
}

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    album: { type: "string" },
    title: { type: "string" },
    date: { type: "string" },
    description: { type: "string" },
  },
});

const dir = positionals[0];
const album = values.album;
if (!dir || !album) fail('Usage: npm run photos -- <folder> --album <slug> [--title "Title"] [--date YYYY-MM]');
if (!/^[a-z0-9-]+$/.test(album)) fail("--album may contain only lowercase letters, digits, and hyphens.");
if (values.date && !/^\d{4}-\d{2}$/.test(values.date)) fail("--date must use the format YYYY-MM.");

const albumFile = `src/content/photos/${album}.yaml`;
const existing = await readFile(albumFile, "utf8").then(parse, () => null);
const previous = new Map<string, Photo>((existing?.photos ?? []).map((photo: Photo) => [photo.id, photo]));

const names = (await readdir(dir)).sort();
const inputs = names.filter((name) => INPUT_TYPES.has(path.extname(name).toLowerCase()));
for (const name of names) {
  if (!inputs.includes(name) && !name.startsWith(".")) console.warn(`Skipped ${name}: unsupported file type`);
}
if (inputs.length === 0) fail(`No supported photos found in ${dir}.`);

const usesR2 = Object.keys(process.env).some((key) => key.startsWith("R2_") && process.env[key]);
const store = usesR2 ? await r2Store() : localStore();
const seen = new Set<string>();
const processed = new Map<string, Photo>();

for (const name of inputs) {
  const base =
    path
      .parse(name)
      .name.toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "photo";
  let id = base;
  for (let n = 2; seen.has(id); n++) id = `${base}-${n}`;
  seen.add(id);

  const urls = {} as Record<keyof typeof SIZES, string>;
  let width = 0;
  let height = 0;
  for (const [size, limit] of Object.entries(SIZES) as [keyof typeof SIZES, number][]) {
    // rotate() applies the EXIF orientation; sharp drops all metadata from its output.
    const { data, info } = await sharp(path.join(dir, name))
      .rotate()
      .resize({ width: limit, height: limit, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer({ resolveWithObject: true });
    urls[size] = await store(`${album}/${id}-${limit}.webp`, data);
    width = info.width;
    height = info.height;
  }

  processed.set(id, { id, alt: previous.get(id)?.alt ?? "", ...urls, width, height });
  console.log(`${name} -> ${id} (${width}x${height})`);
}

const photos = [...previous.values().filter((photo) => !processed.has(photo.id)), ...processed.values()];
const output = {
  title: values.title ?? existing?.title ?? album,
  date: values.date ?? existing?.date ?? new Date().toISOString().slice(0, 7),
  ...((values.description ?? existing?.description) ? { description: values.description ?? existing.description } : {}),
  photos,
};

await writeFile(albumFile, stringify(output));
const missingAlt = photos.filter((photo) => !photo.alt).length;
console.log(`Wrote ${albumFile} with ${photos.length} photos.`);
if (missingAlt > 0) console.log(`Add alt text for ${missingAlt} photos in that file.`);
