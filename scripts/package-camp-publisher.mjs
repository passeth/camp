import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = process.cwd();
const sourceDir = path.join(root, "plugins", "camp-publisher");
const outDir = path.join(root, "public", "downloads");
const outFile = path.join(outDir, "camp-publisher.zip");
const tempRoot = mkdtempSync(path.join(tmpdir(), "camp-publisher-"));
const packageDir = path.join(tempRoot, "camp-publisher");

mkdirSync(packageDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

for (const file of ["manifest.json", "main.js", "styles.css"]) {
  copyFileSync(path.join(sourceDir, file), path.join(packageDir, file));
}

try {
  rmSync(outFile, { force: true });
  execFileSync("zip", ["-qr", outFile, "camp-publisher"], { cwd: tempRoot, stdio: "inherit" });
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

writeFileSync(path.join(outDir, "camp-publisher.version.txt"), `camp-publisher ${new Date().toISOString()}\n`);
console.log(`Created ${outFile}`);
