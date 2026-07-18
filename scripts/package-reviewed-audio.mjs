import { promises as fs } from "node:fs";
import path from "node:path";

const root = process.cwd();
const phrases = JSON.parse(await fs.readFile(path.join(root, "audio", "phrases.json"), "utf8"));
const review = JSON.parse(await fs.readFile(path.join(root, "audio", "review.json"), "utf8"));
const phraseById = new Map(phrases.map((item) => [item.id, item]));
const generatedDir = path.join(root, "audio", "generated");
const publicDir = path.join(root, "public", "audio");
const audioPackPath = path.join(root, "data", "audio-pack.json");
const conceptReviewsPath = path.join(root, "data", "concept-reviews.json");

await fs.mkdir(publicDir, { recursive: true });
const audioPack = {};
const conceptReviews = {};
const approvedIds = new Set();

for (const item of review.items) {
  if (!phraseById.has(item.id)) throw new Error(`Review contains unknown phrase ID: ${item.id}`);
  if (item.status !== "approved") continue;
  const checks = Object.values(item.checks ?? {});
  if (checks.length !== 5 || checks.some((value) => value !== true)) {
    throw new Error(`${item.id} is marked approved but not every linguistic/audio check passed.`);
  }
  if (!item.reviewer?.trim() || !item.reviewedAt || Number.isNaN(Date.parse(item.reviewedAt))) {
    throw new Error(`${item.id} requires a reviewer name and valid reviewedAt timestamp.`);
  }

  const source = path.join(generatedDir, `${item.id}.wav`);
  const metadataPath = path.join(generatedDir, `${item.id}.json`);
  const metadata = JSON.parse(await fs.readFile(metadataPath, "utf8"));
  const phrase = phraseById.get(item.id);
  if (metadata.script !== phrase.script || metadata.roman !== phrase.roman || metadata.reviewStatus !== "unreviewed") {
    throw new Error(`${item.id} generated metadata does not match the current phrase manifest.`);
  }
  if (
    metadata.model !== review.model ||
    metadata.modelRevision !== review.modelRevision ||
    metadata.voice !== review.voice
  ) {
    throw new Error(`${item.id} was not generated with the reviewed model revision and voice.`);
  }
  await fs.copyFile(source, path.join(publicDir, `${item.id}.wav`));
  approvedIds.add(item.id);
  audioPack[item.id] = `/audio/${item.id}.wav`;
  conceptReviews[item.id] = {
    status: "reviewed",
    source: "native_review",
    reviewer: item.reviewer.trim(),
    reviewedAt: new Date(item.reviewedAt).toISOString()
  };
}

for (const filename of await fs.readdir(publicDir)) {
  if (filename.endsWith(".wav") && !approvedIds.has(filename.slice(0, -4))) {
    await fs.rm(path.join(publicDir, filename));
  }
}

await fs.writeFile(audioPackPath, JSON.stringify(audioPack, null, 2) + "\n");
await fs.writeFile(conceptReviewsPath, JSON.stringify(conceptReviews, null, 2) + "\n");
console.log(`Packaged ${approvedIds.size} reviewed Kannada audio clips.`);
