// @vitest-environment node
import { execFileSync, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ESLint } from "eslint";
import { describe, expect, it } from "vitest";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const eslint = new ESLint({ cwd: projectRoot });

describe("ESLint configuration", () => {
  it("parses valid typed TSX without errors", async () => {
    const [result] = await eslint.lintText('export default function Example({ label }: { label: string }) { return <button type="button">{label}</button>; }', { filePath: "app/lint-fixture.tsx" });
    expect(result.messages).toEqual([]);
  });

  it("catches unsafe explicit any and conditional hooks", async () => {
    const [result] = await eslint.lintText('import { useState } from "react"; export default function Example({ enabled }: { enabled: any }) { if (enabled) { useState(0); } return <div />; }', { filePath: "app/lint-fixture.tsx" });
    expect(result.messages.map((message) => message.ruleId)).toEqual(expect.arrayContaining(["@typescript-eslint/no-explicit-any", "react-hooks/rules-of-hooks"]));
    expect(result.errorCount).toBeGreaterThan(0);
  });

  it.each([".next/generated.ts", "out/generated.ts", "dist/generated.ts", "coverage/generated.ts", ".pnpm-store/generated.ts", "next-env.d.ts"])("ignores generated file %s", async (file) => {
    expect(await eslint.isPathIgnored(file)).toBe(true);
  });

  it("CLI accepts valid TSX and rejects invalid TypeScript with a nonzero exit status", () => {
    const executable = fileURLToPath(new URL("../node_modules/eslint/bin/eslint.js", import.meta.url));
    const args = [executable, "--stdin", "--stdin-filename", "app/lint-fixture.tsx", "--max-warnings", "0"];
    expect(() => execFileSync(process.execPath, args, { cwd: projectRoot, input: 'export default function Example() { return <p>Okay</p>; }', encoding: "utf8" })).not.toThrow();
    const invalid = spawnSync(process.execPath, args, { cwd: projectRoot, input: "export const unsafe: any = 1;", encoding: "utf8" });
    expect(invalid.status).toBe(1);
    expect(invalid.stdout).toContain("@typescript-eslint/no-explicit-any");
  }, 15000);
});
