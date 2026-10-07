// @vitest-environment node
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import provenance from "../data/wikivoyage-provenance.json";
import { wikivoyagePhrases } from "../data/wikivoyage-phrases";

function fileHash(path: string) {
  return createHash("sha256").update(readFileSync(resolve(path))).digest("hex");
}

describe("recovered Wikivoyage source evidence", () => {
  it("binds the recovery evidence to the exact immutable artifact and importer", () => {
    expect(fileHash(provenance.importedArtifact)).toBe(provenance.importedArtifactSha256);
    expect(fileHash(provenance.importer)).toBe(provenance.importerSha256);
    expect(new URL(provenance.revisionUrl).searchParams.get("oldid")).toBe(String(provenance.revisionId));
    expect(new URL(provenance.wikitextApiUrl).searchParams.get("oldid")).toBe(String(provenance.revisionId));
    expect(provenance.wikitextSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("retains every candidate's original source, timestamps, and review state", () => {
    expect(wikivoyagePhrases).toHaveLength(provenance.phraseCount);
    for (const phrase of wikivoyagePhrases) {
      expect(phrase.createdAt).toBe(provenance.importTimestamp);
      expect(phrase.updatedAt).toBe(provenance.importTimestamp);
      expect(phrase.source).toBe("wikivoyage");
      expect(phrase.license).toBe("CC BY-SA");
      expect(phrase.status).toBe("raw_imported");
    }
  });
});
