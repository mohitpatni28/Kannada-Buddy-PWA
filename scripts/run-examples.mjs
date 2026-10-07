import { readdir, readFile } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const examples = ["learn-first-phrase", "retain-progress", "review-synthetic-export"];
export function selectExamples(names) {
  if (names[0] === "--") names = names.slice(1);
  if (names.some((name) => !examples.includes(name))) throw new Error(`Unknown example. Choose: ${examples.join(", ")}`);
  return names.length ? [...new Set(names)] : examples;
}
export async function validateIndex(root = process.cwd()) {
  const directories = (await readdir(resolve(root, "examples"), { withFileTypes: true })).filter((item) => item.isDirectory()).map((item) => item.name).sort();
  if (JSON.stringify(directories) !== JSON.stringify([...examples].sort())) throw new Error("Example folders do not match the runner manifest.");
  const index = await readFile(resolve(root, "examples/README.md"), "utf8");
  const links = [...index.matchAll(/\]\(\.\/([^/#]+)\/?\)/g)].map((match) => match[1]).sort();
  if (JSON.stringify(links) !== JSON.stringify([...examples].sort())) throw new Error("Example index must link each example exactly once.");
  for (const name of examples) {
    const readme = await readFile(resolve(root, "examples", name, "README.md"), "utf8");
    if (!readme.includes(`pnpm examples:check -- ${name}`)) throw new Error(`Missing run command in ${name}.`);
    await readFile(resolve(root, "examples", name, "example.spec.ts"), "utf8").catch(() => { throw new Error(`Missing browser workflow in ${name}.`); });
    if (name === "review-synthetic-export") {
      for (const file of ["run.mjs", "synthetic-review.json"]) await readFile(resolve(root, "examples", name, file), "utf8").catch(() => { throw new Error(`Missing ${file} in ${name}.`); });
    }
  }
}
export function runCommand(command, args, { timeoutMs = 180_000, cwd = process.cwd(), stdio = "inherit" } = {}) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, { cwd, stdio, detached: process.platform !== "win32" });
    let timedOut = false;
    const stop = () => {
      if (!child.pid) return;
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore", timeout: 5000 });
      } else {
        try { process.kill(-child.pid, "SIGKILL"); }
        catch (error) { if (error.code !== "ESRCH") throw error; }
      }
    };
    const timer = setTimeout(() => { timedOut = true; stop(); }, timeoutMs);
    child.once("error", (error) => { clearTimeout(timer); reject(error); });
    child.once("close", (status, signal) => {
      clearTimeout(timer);
      // Also remove descendants if a failing runner left its web server alive.
      stop();
      if (timedOut) reject(new Error(`Command timed out after ${timeoutMs}ms: ${command}`));
      else if (status !== 0) reject(new Error(`Command failed (exit ${status ?? signal}): ${command}`));
      else accept();
    });
  });
}
async function main() {
  await validateIndex();
  const selected = selectExamples(process.argv.slice(2));
  for (const name of selected) {
    await runCommand("pnpm", ["exec", "playwright", "test", "--config", "examples/playwright.config.ts", `examples/${name}/example.spec.ts`]);
    if (name === "review-synthetic-export") await runCommand(process.execPath, [`examples/${name}/run.mjs`]);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
