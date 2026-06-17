import { copyFileSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";

const vaultPath = process.argv[2];
if (!vaultPath) {
  console.error("Usage: node scripts/install-camp-publisher.mjs <obsidian-vault-path>");
  process.exit(1);
}

const sourceDir = path.join(process.cwd(), "plugins", "camp-publisher");
const targetDir = path.join(vaultPath, ".obsidian", "plugins", "camp-publisher");

mkdirSync(targetDir, { recursive: true });
for (const file of ["manifest.json", "main.js", "styles.css"]) {
  copyFileSync(path.join(sourceDir, file), path.join(targetDir, file));
}

// Remove stale README from old manual installs so Obsidian only sees runtime files.
try {
  rmSync(path.join(targetDir, "README.md"));
} catch {}

console.log(`Camp Publisher installed to ${targetDir}`);
