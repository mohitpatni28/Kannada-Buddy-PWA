import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// These attestations are synthetic test data, never genuine linguistic approvals.
const fixture = JSON.parse(await readFile(new URL("./synthetic-review.json", import.meta.url), "utf8"));
const directory = await mkdtemp(join(tmpdir(), "kannada-example-review-"));
const tracked = resolve("data/published-phrases.json");
const before = await readFile(tracked);
try {
  const input = join(directory, "synthetic-review.json");
  const output = join(directory, "published.json");
  const empty = JSON.stringify({ format: "kannada-buddy-published-reviews", version: 1, records: [] });
  await writeFile(input, JSON.stringify(fixture));
  await writeFile(output, empty);
  const check = () => spawnSync(process.execPath, ["--experimental-strip-types", "scripts/publish-reviewed-phrases.mjs", "--input", input, "--output", output, "--check"], { encoding: "utf8", timeout: 30_000 });
  const accepted = check();
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.match(accepted.stdout, /Validated 1 reviewed phrases; publication would contain 1\. No files changed\./);
  assert.equal(await readFile(output, "utf8"), empty);
  fixture.records[0].review.checks.meaning = false;
  await writeFile(input, JSON.stringify(fixture));
  const rejected = check();
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.match(rejected.stderr, /Publication rejected/);
  assert.equal(await readFile(output, "utf8"), empty);
  assert.deepEqual(await readFile(tracked), before);
  console.log("Synthetic review accepted; incomplete review rejected; no publication files changed.");
} finally {
  await rm(directory, { recursive: true, force: true });
}
