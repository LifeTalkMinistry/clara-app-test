import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const needle = ["supa", "base"].join("");
const ignoredDirectories = new Set([".git", "node_modules", "dist", ".vercel"]);
const ignoredExtensions = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".pdf", ".zip", ".woff", ".woff2", ".ttf", ".mp3", ".mp4", ".mov",
]);

const matches = [];

async function scanDirectory(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;

    const fullPath = path.join(directory, entry.name);
    const relativePath = path.relative(process.cwd(), fullPath).replaceAll(path.sep, "/");

    if (relativePath.toLowerCase().includes(needle)) {
      matches.push(`${relativePath} (path)`);
    }

    if (entry.isDirectory()) {
      await scanDirectory(fullPath);
      continue;
    }

    if (!entry.isFile() || ignoredExtensions.has(path.extname(entry.name).toLowerCase())) continue;

    try {
      const content = await readFile(fullPath, "utf8");
      if (content.toLowerCase().includes(needle)) {
        matches.push(`${relativePath} (content)`);
      }
    } catch {
      // Ignore unreadable/binary-like files; source and config files remain covered.
    }
  }
}

await scanDirectory(process.cwd());

if (matches.length > 0) {
  console.error("Legacy provider references remain:");
  for (const match of matches) console.error(`- ${match}`);
  process.exit(1);
}

console.log("Legacy provider scan passed: zero references found.");
