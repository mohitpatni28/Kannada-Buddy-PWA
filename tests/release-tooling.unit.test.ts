// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { examples, selectExamples, validateIndex, runCommand } from "../scripts/run-examples.mjs";
import { checkLocalLinks, checkSnippetDrift } from "../scripts/check-release-docs.mjs";

const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kannada-release-tooling-"));
  temporary.push(root);
  for (const name of examples) {
    await mkdir(join(root, "examples", name), { recursive: true });
    await writeFile(join(root, "examples", name, "README.md"), `pnpm examples:check -- ${name}`);
    await writeFile(join(root, "examples", name, "example.spec.ts"), "// Temporary manifest fixture. Not an executed browser workflow.");
    if (name === "review-synthetic-export") {
      await writeFile(join(root, "examples", name, "run.mjs"), "// Temporary manifest fixture.");
      await writeFile(join(root, "examples", name, "synthetic-review.json"), "{}");
    }
  }
  await writeFile(join(root, "examples/README.md"), examples.map((name: string) => `[${name}](./${name}/)`).join("\n"));
  return root;
}
describe("release example manifest", () => {
  it("selects all or named examples and rejects unknown commands", () => {
    expect(selectExamples([])).toEqual(examples);
    expect(selectExamples([examples[0], examples[0]])).toEqual([examples[0]]);
    expect(() => selectExamples(["--config", "$(touch private)"])).toThrow("Unknown example");
  });
  it("accepts the separator forwarded by documented pnpm commands without accepting arbitrary flags", () => {
    expect(selectExamples(["--", examples[2]])).toEqual([examples[2]]);
    expect(selectExamples(["--"])).toEqual(examples);
    expect(() => selectExamples(["--", "--config"])).toThrow("Unknown example");
  });
  it("checks real folders and commands and rejects missing or duplicated index entries", async () => {
    const root = await fixture();
    await expect(validateIndex(root)).resolves.toBeUndefined();
    await writeFile(join(root, "examples/README.md"), `[one](./${examples[0]}/)\n[again](./${examples[0]}/)`);
    await expect(validateIndex(root)).rejects.toThrow("index");
  });
  it("rejects missing browser workflows and CLI fixtures instead of silently omitting entry points", async () => {
    const root = await fixture();
    await rm(join(root, "examples", examples[0], "example.spec.ts"));
    await expect(validateIndex(root)).rejects.toThrow("Missing browser workflow");
    await writeFile(join(root, "examples", examples[0], "example.spec.ts"), "// Temporary manifest fixture.");
    await rm(join(root, "examples/review-synthetic-export/synthetic-review.json"));
    await expect(validateIndex(root)).rejects.toThrow("Missing synthetic-review.json");
  });
  it("rejects undiscoverable examples and command drift", async () => {
    const root = await fixture();
    await mkdir(join(root, "examples/hidden-example"));
    await expect(validateIndex(root)).rejects.toThrow("folders");
    await rm(join(root, "examples/hidden-example"), { recursive: true });
    await writeFile(join(root, "examples", examples[0], "README.md"), "pnpm wrong-command");
    await expect(validateIndex(root)).rejects.toThrow("Missing run command");
  });
});
describe("documentation drift checks", () => {
  const contract = [{ id: "validate", commands: ["pnpm lint", "pnpm test"], verification: "release-suite", reason: "Runs real lint and tests in isolation." }];
  const markdown = "<!-- checked-snippet: validate -->\n```sh\npnpm lint\npnpm test\n```";
  it("accepts the exact documented command block without executing prose", () => {
    expect(() => checkSnippetDrift(markdown, contract)).not.toThrow();
  });
  it("rejects changed commands, missing contracts, unmarked and duplicated blocks", () => {
    expect(() => checkSnippetDrift(markdown.replace("pnpm lint", "pnpm lint --fix"), contract)).toThrow("drift");
    expect(() => checkSnippetDrift("", contract)).toThrow("missing");
    expect(() => checkSnippetDrift(markdown.replace("<!-- checked-snippet: validate -->\n", ""), contract)).toThrow("unmarked");
    expect(() => checkSnippetDrift(markdown + "\n" + markdown, contract)).toThrow("repeated");
    expect(() => checkSnippetDrift(markdown, [{ ...contract[0], reason: "" }])).toThrow("verification scope");
  });
  it("checks relative and image links and rejects missing paths and escapes", async () => {
    const root = await fixture();
    await writeFile(join(root, "README.md"), "test");
    const file = join(root, "examples/README.md");
    await expect(checkLocalLinks('[root](../README.md#title) <img src="../README.md"/> [external](https://example.com) [anchor](#title)', file, root)).resolves.toBeUndefined();
    await expect(checkLocalLinks("[missing](./absent.md)", file, root)).rejects.toThrow("Broken local link");
    await expect(checkLocalLinks("[outside](../../private.md)", file, root)).rejects.toThrow("escapes");
  });
});

describe("example subprocess boundary", () => {
  it("executes real commands and reports failing exits, startup failures and timeouts", async () => {
    await expect(runCommand(process.execPath, ["-e", "process.exit(0)"], { stdio: "ignore" })).resolves.toBeUndefined();
    await expect(runCommand(process.execPath, ["-e", "process.exit(7)"], { stdio: "ignore" })).rejects.toThrow("exit 7");
    await expect(runCommand("kannada-release-command-that-does-not-exist", [], { stdio: "ignore" })).rejects.toThrow();
    await expect(runCommand(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { stdio: "ignore", timeoutMs: 100 })).rejects.toThrow("timed out");
  });
});
