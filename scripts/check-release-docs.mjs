import { access, readFile, readdir } from "node:fs/promises";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { pathToFileURL } from "node:url";
import { validateIndex } from "./run-examples.mjs";

export function checkSnippetDrift(markdown, contract) {
  const blocks = [...markdown.matchAll(/(?:<!-- checked-snippet: ([a-z-]+) -->\s*)?```(?:sh|bash)\n([\s\S]*?)```/g)];
  const seen = new Set();
  for (const [, id, code] of blocks) {
    const entry = contract.find((item) => item.id === id);
    if (!entry || seen.has(id)) throw new Error(`Unknown or repeated README shell snippet: ${id ?? "unmarked"}.`);
    if (code.trim() !== entry.commands.join("\n")) throw new Error(`README shell snippet drift: ${id}.`);
    if (!entry.verification || !entry.reason) throw new Error(`Missing verification scope for ${id}.`);
    seen.add(id);
  }
  if (contract.some((entry) => !seen.has(entry.id))) throw new Error("A contracted README shell snippet is missing.");
}
export async function checkLocalLinks(markdown, file, root) {
  const links = [...markdown.matchAll(/\]\(([^\s)]+)(?:\s+"[^"\n]*")?\)|(?:src|href)="([^"\n]+)"/g)].map((match) => match[1] ?? match[2]);
  for (const link of links) {
    if (/^(?:https?:|mailto:|#)/.test(link)) continue;
    const target = resolve(dirname(file), decodeURIComponent(link.split("#")[0]));
    const fromRoot = relative(root, target);
    if (fromRoot.startsWith("..") || isAbsolute(fromRoot)) throw new Error(`Documentation link escapes repository: ${link}.`);
    await access(target).catch(() => { throw new Error(`Broken local link in ${relative(root, file)}: ${link}.`); });
  }
}
async function markdownFiles(directory) {
  const result = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, item.name);
    if (item.isDirectory()) result.push(...await markdownFiles(path));
    else if (item.name.endsWith(".md")) result.push(path);
  }
  return result;
}
async function main() {
  const root = process.cwd();
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const contract = JSON.parse(await readFile(resolve(root, "examples/docs-contract.json"), "utf8"));
  checkSnippetDrift(readme, contract);
  await validateIndex(root);
  const files = [resolve(root, "README.md"), resolve(root, "CONTRIBUTING.md"), resolve(root, "SECURITY.md"), ...await markdownFiles(resolve(root, "examples")), ...await markdownFiles(resolve(root, "docs"))];
  for (const file of files) await checkLocalLinks(await readFile(file, "utf8"), file, root);
  console.log(`Checked ${files.length} documents, local links, example index, and ${contract.length} README snippet contracts. External links and interactive bootstrap commands require separate release evidence.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
