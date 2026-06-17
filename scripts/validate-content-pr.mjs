import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

const contentTypes = ["press", "topic", "daily-review", "study-log", "teach"];
const statusValues = ["draft", "review", "published", "archived"];
const visibilityValues = ["public", "members"];
const typeDir = new Map([
  ["press", "press"],
  ["topic", "topics"],
  ["daily-review", "daily-review"],
  ["study-log", "study-log"],
  ["teach", "teach"],
]);

const frontmatterSchema = z.object({
  title: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
  type: z.enum(contentTypes),
  contentFormat: z.enum(["markdown", "html"]).optional(),
  status: z.enum(statusValues),
  visibility: z.enum(visibilityValues),
  author: z.string().min(1),
  memberSlug: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string().min(1),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  excerpt: z.string().min(1).max(280).optional(),
});

function run(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function fail(message) {
  console.error(`Content PR validation failed: ${message}`);
  process.exit(1);
}

const args = process.argv.slice(2);
const allMode = args.includes("--all");
const [baseRef = "origin/main", headRef = "HEAD"] = args.filter((arg) => arg !== "--all");
let changed = [];

if (!allMode) {
  const changedRaw = run(["diff", "--name-status", `${baseRef}...${headRef}`]);
  if (!changedRaw) fail("PR does not change any files");

  changed = changedRaw.split("\n").map((line) => {
    const [status, file] = line.split(/\s+/, 2);
    return { status, file };
  });

  for (const { status, file } of changed) {
    if (!file.startsWith("content/")) fail(`Only content files may change, found ${file}`);
    if (!/\.(md|html)$/.test(file)) fail(`Only Markdown or HTML content files may change, found ${file}`);
    if (status.startsWith("D")) fail(`Deleting content is not allowed in auto-merge PRs: ${file}`);
  }
}

const contentFiles = new Set([
  ...run(["ls-files", "content"]).split("\n").filter(Boolean),
  ...run(["ls-files", "--others", "--exclude-standard", "content"]).split("\n").filter(Boolean),
]);

const seen = new Map();
for (const file of contentFiles) {
  if (!/\.(md|html)$/.test(file) || !existsSync(file)) continue;
  const extension = path.extname(file);
  const parsed = matter(readFileSync(file, "utf8"));
  const result = frontmatterSchema.safeParse(parsed.data);
  if (!result.success) fail(`${file} has invalid frontmatter: ${result.error.issues.map((issue) => issue.message).join(", ")}`);

  const entry = result.data;
  const format = entry.contentFormat ?? (extension === ".html" ? "html" : "markdown");
  if (extension === ".html" && format !== "html") fail(`${file} must set contentFormat: html`);
  if (extension !== ".html" && format === "html") fail(`${file} uses contentFormat: html but is not an .html file`);
  const expectedDir = typeDir.get(entry.type);
  const parts = file.split(path.sep);
  if (parts[0] !== "content" || parts[1] !== expectedDir) {
    fail(`${file} is in the wrong folder for type ${entry.type}; expected content/${expectedDir}/`);
  }

  const key = `${entry.type}:${entry.slug}`;
  const previous = seen.get(key);
  if (previous) fail(`Duplicate content slug ${key} in ${previous} and ${file}`);
  seen.set(key, file);
}

console.log(allMode ? "Content validation passed for all Markdown/HTML files." : `Content PR validation passed for ${changed.length} changed file(s).`);
