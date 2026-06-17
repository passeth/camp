import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";

export const contentTypes = ["press", "topic", "daily-review", "study-log", "teach"] as const;
export type ContentType = (typeof contentTypes)[number];

const contentDirByType: Record<ContentType, string> = {
  press: "press",
  topic: "topics",
  "daily-review": "daily-review",
  "study-log": "study-log",
  teach: "teach",
};

const baseHrefByType: Record<ContentType, string> = {
  press: "/press",
  topic: "/topics",
  "daily-review": "/daily-review",
  "study-log": "/study-log",
  teach: "/teach",
};

const frontmatterSchema = z.object({
  title: z.string(),
  slug: z.string(),
  type: z.enum(contentTypes),
  status: z.enum(["draft", "review", "published", "archived"]).default("draft"),
  visibility: z.enum(["public", "members"]).default("public"),
  author: z.string(),
  memberSlug: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  publishedAt: z.string().optional(),
  coverImage: z.string().optional(),
  excerpt: z.string().optional(),
});

export type ContentEntry = z.infer<typeof frontmatterSchema> & {
  content: string;
  excerpt: string;
  href: string;
  pathSegments: string[];
};

function rootContentDir() {
  return path.join(process.cwd(), "content");
}

function walkMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    if (entry.isFile() && /\.mdx?$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function excerptFromContent(content: string) {
  return content
    .replace(/^# .+$/m, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>-]/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);
}

function hrefForEntry(type: ContentType, slug: string) {
  return `${baseHrefByType[type]}/${slug}`.replace(/\/index$/, "");
}

export function getAllContentEntries({ includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  const entries = contentTypes.flatMap((type) => getEntriesByType(type, { includeUnpublished }));
  return entries.sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
}

export function getEntriesByType(type: ContentType, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  const dir = path.join(rootContentDir(), contentDirByType[type]);
  return walkMarkdownFiles(dir)
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      const data = frontmatterSchema.parse(parsed.data);
      const relative = path.relative(dir, filePath).replace(/\.mdx?$/, "");
      const segments = relative.split(path.sep).filter(Boolean);
      return {
        ...data,
        content: parsed.content.trim(),
        excerpt: data.excerpt ?? excerptFromContent(parsed.content),
        href: hrefForEntry(data.type, data.slug),
        pathSegments: segments,
      } satisfies ContentEntry;
    })
    .filter((entry) => entry.type === type)
    .filter((entry) => includeUnpublished || (entry.status === "published" && entry.visibility === "public"))
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
}

export function getEntryByTypeAndSlug(type: ContentType, slug: string, options?: { includeUnpublished?: boolean }) {
  return getEntriesByType(type, options).find((entry) => entry.slug === slug);
}

export function getLatestEntries(limit = 6) {
  return getAllContentEntries().slice(0, limit);
}

export function getEntriesByMember(memberSlug: string) {
  return getAllContentEntries().filter((entry) => entry.memberSlug === memberSlug);
}

export function getTopicSubtree(segments: string[] = []) {
  const prefix = segments.join("/");
  return getEntriesByType("topic").filter((entry) => {
    const entryPath = entry.pathSegments.join("/");
    return !prefix || entryPath === prefix || entryPath.startsWith(`${prefix}/`);
  });
}
