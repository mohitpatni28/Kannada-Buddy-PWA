// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hash = (file: string) => createHash("sha256").update(readFileSync(file)).digest("hex");

describe("reproduced packaged audio evidence", () => {
  it("binds every reproduction to the unchanged packaged WAV and source text", () => {
    const provenance = JSON.parse(readFileSync("data/audio-provenance.json", "utf8"));
    const phrases = JSON.parse(readFileSync("audio/phrases.json", "utf8"));
    expect(provenance.items).toHaveLength(phrases.length);
    expect(new Set(provenance.items.map((item: { id: string }) => item.id)).size).toBe(phrases.length);
    for (const phrase of phrases) {
      const item = provenance.items.find((candidate: { id: string }) => candidate.id === phrase.id);
      expect(item).toBeDefined();
      expect(item.script).toBe(phrase.script);
      expect(item.roman).toBe(phrase.roman);
      expect(item.sha256).toBe(hash(`public/audio/${phrase.id}.wav`));
      expect(item.modelRevision).toBe(provenance.modelRevision);
      expect(item.reviewStatus).toBe("unreviewed");
      expect(item.sampleRate).toBe(44100);
    }
  });

  it("keeps historical quality decisions distinct from retrospective generation evidence", () => {
    const provenance = JSON.parse(readFileSync("data/audio-provenance.json", "utf8"));
    expect(provenance.recordType).toBe("byte-identical-reproduction");
    expect(provenance.originalGenerationMetadataRecovered).toBe(false);
    expect(hash("audio/review.json")).toBe(provenance.reviewManifestSha256);
    expect(hash("audio/phrases.json")).toBe(provenance.inputManifestSha256);
    expect(hash("audio/generate.py")).toBe(provenance.generatorSha256);
    const review = JSON.parse(readFileSync("audio/review.json", "utf8"));
    expect(provenance.modelRevision).toBe(review.modelRevision);
    expect(provenance.voice).toBe(review.voice);
  });
});
