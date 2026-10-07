// @vitest-environment node
import { afterEach, describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";
import { ESLint } from "eslint";

const requireFromConfig = createRequire(createRequire(import.meta.url).resolve("eslint-config-next"));
const pluginEntry = requireFromConfig.resolve("@next/eslint-plugin-next");
const { getRootDirs }: { getRootDirs: (context: { cwd: string; settings: { next?: { rootDir?: string | string[] } } }) => string[] } = requireFromConfig(join(dirname(pluginEntry), "utils/get-root-dirs.js"));
const temporary: string[] = [];
afterEach(async () => {
  await Promise.all(temporary.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), "kannada-glob-regression-"));
  temporary.push(root);
  for (const directory of ["apps/first/pages", "apps/second/pages", "apps/.hidden/pages", "packages/deep/third/pages"]) await mkdir(join(root, directory), { recursive: true });
  await writeFile(join(root, "apps/not-a-directory"), "fixture");
  await writeFile(join(root, "apps/first/pages/about.tsx"), "export default function About() { return null; }");
  return root;
}
const roots = (root: string, rootDir?: string | string[]) => getRootDirs({ cwd: root, settings: { next: { rootDir } } }).sort();

describe("Next ESLint root discovery dependency", () => {
  it("excludes the vulnerable braces implementation from the full resolved dependency tree", () => {
    const output = execFileSync("pnpm", ["why", "braces", "--json"], { encoding: "utf8", timeout: 30_000 });
    expect(JSON.parse(output)).toEqual([]);
  }, 35_000);
  it("rejects hostile nested brace patterns through the actual replacement boundary", () => {
    const program = `const { getRootDirs } = require(process.argv[1]);
      const depth = Number(process.argv[2]);
      const pattern = process.argv[2] === "flat" ? "{no-such-a,no-such-b}".repeat(40) : "{".repeat(depth) + "no-such-a,no-such-b" + "}".repeat(depth);
      try {
        const matches = getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: pattern } } });
        console.log(JSON.stringify({ matches }));
      } catch (error) { console.log(JSON.stringify({ name: error.name, message: error.message })); process.exitCode = 1; }`;
    for (const depth of [99, 100, "flat"]) {
      const result = spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), String(depth)], { encoding: "utf8", timeout: 5000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(0);
      expect(JSON.parse(result.stdout)).toEqual({ matches: [] });
    }
    for (const depth of [101, 4000, 16000]) {
      const result = spawnSync(process.execPath, ["-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), String(depth)], { encoding: "utf8", timeout: 5000 });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(1);
      expect(JSON.parse(result.stdout)).toEqual({ name: "Error", message: "Next root directory patterns support at most 100 nested braces." });
    }
  }, 20_000);
  it("bounds nested and flat extglobs before matcher recursion or expansion", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kannada-extglob-boundary-"));
    temporary.push(directory);
    const program = `const { getRootDirs } = require(process.argv[1]);
      const variant = process.argv[2]; const count = Number(process.argv[3]); const flat = process.argv[4] === "flat";
      const pattern = flat ? "!(a|b)".repeat(count) : (variant + "(").repeat(count) + "x" + ")".repeat(count);
      try { console.log(JSON.stringify({ matches: getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: pattern } } }) })); }
      catch (error) { console.log(JSON.stringify({ name: error.name, message: error.message })); process.exitCode = 1; }`;
    const run = (variant: string, count: number, flat = false) => spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), variant, String(count), flat ? "flat" : "nested"], { encoding: "utf8", timeout: 5000, cwd: directory });
    for (const variant of ["@", "!", "?", "+", "*"]) {
      for (const count of [4, 5]) {
        const result = run(variant, count);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(0);
        expect(JSON.parse(result.stdout)).toEqual({ matches: [] });
      }
      for (const count of [6, 100, 1000, 4000]) {
        const result = run(variant, count);
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(1);
        expect(JSON.parse(result.stdout)).toEqual({ name: "Error", message: "Next root directory patterns support at most 5 extglob groups." });
      }
    }
    for (const count of [4, 5, 6, 10, 16, 40]) {
      const result = run("!", count, true);
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(count <= 5 ? 0 : 1);
      expect(JSON.parse(result.stdout)).toEqual(count <= 5 ? { matches: [] } : { name: "Error", message: "Next root directory patterns support at most 5 extglob groups." });
    }
  }, 30_000);
  it("bounds literal or malformed group nesting and keeps flat character classes bounded", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kannada-matcher-syntax-"));
    temporary.push(directory);
    const program = `const { getRootDirs } = require(process.argv[1]);
      const kind = process.argv[2]; const depth = Number(process.argv[3]);
      const pattern = kind === "flat-class" ? "[ab]".repeat(depth) : kind === "class" ? "[".repeat(depth) + "x" + "]".repeat(depth) : "(".repeat(depth) + "x" + ")".repeat(depth);
      try { console.log(JSON.stringify({ matches: getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: pattern } } }) })); }
      catch (error) { console.log(JSON.stringify({ name: error.name, message: error.message })); process.exitCode = 1; }`;
    for (const kind of ["class", "literal"]) {
      for (const depth of (kind === "class" ? [15, 16, 17, 1000, 4000] : [4, 5, 6, 1000, 4000])) {
        const result = spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), kind, String(depth)], { encoding: "utf8", timeout: 5000, cwd: directory });
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(depth <= (kind === "class" ? 16 : 5) ? 0 : 1);
        expect(JSON.parse(result.stdout)).toEqual(depth <= (kind === "class" ? 16 : 5) ? { matches: [] } : { name: "Error", message: kind === "class" ? "Next root directory patterns support at most 16 nested brackets." : "Next root directory patterns support at most 5 opening parentheses." });
      }
    }
    const flat = spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), "flat-class", "4000"], { encoding: "utf8", timeout: 5000, cwd: directory });
    expect(flat.error).toBeUndefined();
    expect(flat.status, flat.stdout + flat.stderr).toBe(1);
    expect(JSON.parse(flat.stdout)).toEqual({ name: "Error", message: "Next root directory patterns support at most 2048 characters." });
    expect(() => roots(directory, "(".repeat(17))).toThrow("5 opening parentheses");
    expect(() => roots(directory, "\\(".repeat(17))).toThrow("5 opening parentheses");
    expect(() => roots(directory, "[".repeat(17))).toThrow("16 nested brackets");
  }, 20_000);
  it("bounds groups synthesized by brace alternatives before matcher expansion", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kannada-brace-extglob-boundary-"));
    temporary.push(directory);
    const program = `const { getRootDirs } = require(process.argv[1]);
      const pattern = process.argv[2].repeat(Number(process.argv[3]));
      try { console.log(JSON.stringify({ matches: getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: pattern } } }) })); }
      catch (error) { console.log(JSON.stringify({ name: error.name, message: error.message })); process.exitCode = 1; }`;
    for (const variant of ["{!,!}(a|b)", "!{(,(}a|b)", "!{(,x}a|b)"]) {
      for (const count of [4, 5, 6, 10, 16, 40]) {
        const result = spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), variant, String(count)], { encoding: "utf8", timeout: 5000, cwd: directory });
        const accepted = count * (variant === "!{(,(}a|b)" ? 2 : 1) <= 5;
        expect(result.error).toBeUndefined();
        expect(result.status, result.stdout + result.stderr).toBe(accepted ? 0 : 1);
        expect(JSON.parse(result.stdout)).toEqual(accepted ? { matches: [] } : { name: "Error", message: "Next root directory patterns support at most 5 opening parentheses." });
      }
    }
  }, 30_000);
  it("keeps parentheses counts bounded across the resolved brace expander's ranges and alternatives", () => {
    const requireFromGlob = createRequire(createRequire(pluginEntry).resolve("fast-glob"));
    const requireFromMatcher = createRequire(requireFromGlob.resolve("minimatch"));
    const { expand }: { expand: (pattern: string) => string[] } = requireFromMatcher("brace-expansion");
    expect(expand("{!..?}")).toEqual(["{!..?}"]);
    for (const pattern of ["{!..?}", "{z..A}|", "{A..z}", "{z..A}", "{-40..40}", "!{(,(}a|b)", "{!,!}(a|b)", "!{(,x}a|b)"]) {
      const rawCount = [...pattern].filter((character) => character === "(").length;
      for (const candidate of expand(pattern)) {
        expect([...candidate].filter((character) => character === "(").length).toBeLessThanOrEqual(rawCount);
        expect([...candidate].filter((character) => character === "|").length).toBeLessThanOrEqual([...pattern].filter((character) => character === "|").length);
      }
    }
  });
  it("bounds wide alternation and normalized pattern length before matching", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kannada-wide-matcher-boundary-"));
    temporary.push(directory);
    const program = `const { getRootDirs } = require(process.argv[1]);
      const pattern = process.argv[2];
      try { console.log(JSON.stringify({ matches: getRootDirs({ cwd: process.cwd(), settings: { next: { rootDir: pattern } } }) })); }
      catch (error) { console.log(JSON.stringify({ name: error.name, message: error.message })); process.exitCode = 1; }`;
    const cases: { pattern: string; error?: string }[] = [
      ...[{ width: 100, groups: 5 }, { width: 1000, groups: 2 }].map(({ width, groups }) => ({ pattern: ("!(" + Array.from({ length: width }, (_, index) => `a${index}`).join("|") + ")").repeat(groups), error: "Next root directory patterns support at most 8 alternation pipes." })),
      ...[7, 8, 9].map((count) => ({ pattern: "!(" + "a|".repeat(count) + "b)", ...(count > 8 ? { error: "Next root directory patterns support at most 8 alternation pipes." } : {}) })),
      ...[2047, 2048, 2049].map((length) => ({ pattern: "x".repeat(length), ...(length > 2048 ? { error: "Next root directory patterns support at most 2048 characters." } : {}) })),
      ...[4, 5].map((count) => ({ pattern: "!(a|b)".repeat(count) })),
      ...[7, 8, 9].map((count) => ({ pattern: "{!,!}(" + "a{|,x}".repeat(count) + "b)", ...(count > 8 ? { error: "Next root directory patterns support at most 8 alternation pipes." } : {}) }))
    ];
    for (const { pattern, error } of cases) {
      const result = spawnSync(process.execPath, ["--max-old-space-size=256", "-e", program, join(dirname(pluginEntry), "utils/get-root-dirs.js"), pattern], { encoding: "utf8", timeout: 5000, cwd: directory });
      expect(result.error).toBeUndefined();
      expect(result.status, result.stdout + result.stderr).toBe(error ? 1 : 0);
      expect(JSON.parse(result.stdout)).toEqual(error ? { name: "Error", message: error } : { matches: [] });
    }
  }, 30_000);
  it("bounds unbalanced and backslash-normalized brace patterns conservatively", () => {
    expect(() => roots(process.cwd(), "{".repeat(101))).toThrow("at most 100 nested braces");
    expect(() => roots(process.cwd(), "\\{".repeat(101))).toThrow("at most 100 nested braces");
    expect(roots(process.cwd(), "{".repeat(100))).toEqual([]);
  });
  it("preserves default, explicit, wildcard, recursive, brace and array root patterns", async () => {
    const root = await fixture();
    expect(roots(root)).toEqual([root]);
    expect(roots(root, join(root, "apps/first"))).toEqual([join(root, "apps/first")]);
    expect(roots(root, join(root, "apps/first") + "/")).toEqual([join(root, "apps/first") + "/"]);
    const relativePattern = relative(process.cwd(), join(root, "apps/*"));
    expect(roots(root, relativePattern)).toEqual([relative(process.cwd(), join(root, "apps/first")), relative(process.cwd(), join(root, "apps/second"))]);
    expect(roots(root, join(root, "apps/*"))).toEqual([join(root, "apps/first"), join(root, "apps/second")]);
    expect(roots(root, join(root, "**/pages"))).toEqual([join(root, "apps/first/pages"), join(root, "apps/second/pages"), join(root, "packages/deep/third/pages")].sort());
    expect(roots(root, join(root, "apps/{first,second}"))).toEqual([join(root, "apps/first"), join(root, "apps/second")]);
    expect(roots(root, join(root, "apps/@(first|second)"))).toEqual([join(root, "apps/first"), join(root, "apps/second")]);
    expect(roots(root, join(root, "apps/!(second|.hidden)"))).toEqual([join(root, "apps/first")]);
    expect(roots(root, join(root, "apps/[fs]*"))).toEqual([join(root, "apps/first"), join(root, "apps/second")]);
    expect(roots(root, [join(root, "apps/first"), join(root, "packages/deep/*")])).toEqual([join(root, "apps/first"), join(root, "packages/deep/third")].sort());
    expect(roots(root, join(root, "missing-*"))).toEqual([]);
    expect(roots(root, join(root, "apps/.hidden"))).toEqual([join(root, "apps/.hidden")]);
  });
  it("follows directory symlinks and normalizes backslashes", async () => {
    const root = await fixture();
    await symlink(join(root, "apps/first"), join(root, "apps/linked"), "dir");
    expect(roots(root, join(root, "apps/*"))).toEqual([join(root, "apps/first"), join(root, "apps/linked"), join(root, "apps/second")]);
    expect(roots(root, join(root, "apps/linked"))).toEqual([join(root, "apps/linked")]);
    expect(roots(root, join(root, "**/pages"))).toEqual([join(root, "apps/first/pages"), join(root, "apps/linked/pages"), join(root, "apps/second/pages"), join(root, "packages/deep/third/pages")].sort());
    expect(roots(root, join(root, "apps/first").replaceAll("/", "\\"))).toEqual([join(root, "apps/first")]);
  });
  it("keeps root matching case-sensitive and excludes broken directory symlinks", async () => {
    const root = await fixture();
    await mkdir(join(root, "UPPERCASE"));
    expect(roots(root, join(root, "uppercase*"))).toEqual([]);
    expect(roots(root, join(root, "UPPERCASE"))).toEqual([join(root, "UPPERCASE")]);
    await symlink(join(root, "missing-target"), join(root, "apps/broken"), "dir");
    expect(roots(root, join(root, "apps/*"))).toEqual([join(root, "apps/first"), join(root, "apps/second")]);
  });
  it("keeps Next's internal page-link rule enabled with discovered roots", async () => {
    const root = await fixture();
    const eslint = new ESLint({ cwd: process.cwd(), overrideConfig: { settings: { next: { rootDir: join(root, "apps/*") } } } });
    const [result] = await eslint.lintText('export default function LinkFixture() { return <a href="/about">About</a>; }', { filePath: "app/lint-fixture.tsx" });
    expect(result.messages.map((message) => message.ruleId)).toContain("@next/next/no-html-link-for-pages");
    expect(result.errorCount).toBeGreaterThan(0);
  }, 20_000);
});
