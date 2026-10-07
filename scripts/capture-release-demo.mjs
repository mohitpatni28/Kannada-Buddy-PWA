import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// Capture a real, isolated browser workflow. No personal profile or live service is used.
const root = process.cwd();
const origin = "http://127.0.0.1:3210";
const assets = path.join(root, ".github/assets");
const scratch = await mkdtemp(path.join(tmpdir(), "kannada-demo-"));
let browser;
let server;
const deadline = setTimeout(() => { console.error("Demo capture exceeded 90 seconds."); process.exitCode = 1; server?.kill("SIGTERM"); void browser?.close(); }, 90_000);

async function command(executable, args) {
  const child = spawn(executable, args, { stdio: "inherit" });
  const timer = setTimeout(() => child.kill("SIGTERM"), 30_000);
  try {
    await new Promise((resolve, reject) => {
      child.once("error", reject);
      child.once("exit", (code, signal) => code === 0 ? resolve() : reject(new Error(`${executable} failed: ${code ?? signal}`)));
    });
  } finally { clearTimeout(timer); }
}

try {
  await mkdir(assets, { recursive: true });
  server = spawn(process.execPath, [path.join(root, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", "3210"], { stdio: ["ignore", "ignore", "inherit"] });
  let serverError;
  server.once("error", (error) => { serverError = error; });
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (serverError) throw serverError;
    if (server.exitCode !== null) throw new Error("Demo server exited before becoming ready.");
    try { const response = await fetch(origin); if (response.ok) { ready = true; break; } } catch { /* Wait for the owned server. */ }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  if (!ready) throw new Error("Demo server did not become ready.");
  browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: "light", reducedMotion: "reduce", serviceWorkers: "block" });
  await context.route("**/*", (route) => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const frames = [];
  async function frame(name) {
    const file = path.join(scratch, `${frames.length}.png`);
    await page.screenshot({ path: file, animations: "disabled" });
    frames.push({ file, name });
  }
  await page.goto(origin);
  await expect(page.getByRole("heading", { name: "How do you want to learn?" })).toBeVisible();
  await frame("Choose speaking");
  await page.getByRole("button", { name: /^Speak Kannada/ }).click();
  await expect(page.getByRole("button", { name: "Reveal and compare", exact: true })).toBeVisible();
  await frame("Recall from a prompt");
  await page.getByRole("button", { name: "Reveal and compare", exact: true }).click();
  await expect(page.getByRole("button", { name: "Said it", exact: true })).toBeVisible();
  await frame("Reveal and compare");
  await page.getByRole("button", { name: "Said it", exact: true }).click();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("kannada-buddy-learning-state-v2") ?? "{}"));
  if (Object.values(saved.concepts ?? {}).reduce((total, concept) => total + concept.attempts, 0) !== 1) throw new Error("Expected one persisted speaking attempt.");
  await frame("Next prompt");
  await page.goto(`${origin}/review`);
  await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText("1");
  await frame("View local progress");
  await page.reload();
  await expect(page.locator(".stat-card").filter({ hasText: "learning" }).locator("strong")).toHaveText("1");
  await page.screenshot({ path: path.join(assets, "demo-static.png"), animations: "disabled" });
  await frame("Progress remains after reload");
  if (errors.length) throw new Error(`Browser errors: ${errors.join("; ")}`);
  // Each verified state remains readable for two seconds; this is a captured sequence.
  const timeline = frames.map(({ file }) => `file '${file}'\nduration 2`).join("\n") + `\nfile '${frames.at(-1).file}'\n`;
  const list = path.join(scratch, "frames.txt");
  const palette = path.join(scratch, "palette.png");
  await writeFile(list, timeline);
  await command("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-vf", "fps=3,palettegen", palette]);
  await command("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-i", palette, "-lavfi", "fps=3[x];[x][1:v]paletteuse", "-loop", "0", path.join(assets, "demo.gif")]);
  console.log(`Captured ${frames.length} verified states: ${frames.map(({ name }) => name).join(" → ")}.`);
} finally {
  clearTimeout(deadline);
  await browser?.close();
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await new Promise((resolve) => {
      const timer = setTimeout(() => { server.kill("SIGKILL"); resolve(); }, 3000);
      server.once("exit", () => { clearTimeout(timer); resolve(); });
    });
  }
  await rm(scratch, { recursive: true, force: true });
}
