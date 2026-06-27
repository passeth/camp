import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { z } from "zod";
import { getRemoteEntriesByType } from "@/lib/remote-content-store";

export const contentTypes = ["press", "topic", "daily-review", "study-log", "camp-session", "wall-climb", "teach"] as const;
export type ContentType = (typeof contentTypes)[number];

const contentDirByType: Record<ContentType, string> = {
  press: "press",
  topic: "topics",
  "daily-review": "daily-review",
  "study-log": "study-log",
  "camp-session": "camp-session",
  "wall-climb": "wall-climb",
  teach: "teach",
};

const baseHrefByType: Record<ContentType, string> = {
  press: "/press",
  topic: "/topics",
  "daily-review": "/daily-review",
  "study-log": "/study-log",
  "camp-session": "/camp-session",
  "wall-climb": "/wall-climb",
  teach: "/teach",
};

const frontmatterSchema = z.object({
  title: z.string(),
  slug: z.string(),
  type: z.enum(contentTypes),
  contentFormat: z.enum(["markdown", "html"]).optional(),
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
  pinned: z.boolean().default(false),
  sourceUrl: z.string().url().optional(),
  sourceImage: z.string().url().optional(),
  sourceTitle: z.string().optional(),
  sourceKind: z.enum(["github", "youtube", "x", "web"]).optional(),
  note: z.string().optional(),
  summary: z.string().optional(),
  replyTo: z.object({
    type: z.enum(contentTypes),
    slug: z.string().trim().min(1),
  }).optional(),
});

export type ContentEntry = z.infer<typeof frontmatterSchema> & {
  content: string;
  contentFormat: "markdown" | "html";
  excerpt: string;
  href: string;
  pathSegments: string[];
};

const internalPinnedTag = "__camp_pinned";

function publicTags(tags: readonly string[]) {
  return tags.filter((tag) => tag !== internalPinnedTag);
}

function rootContentDir() {
  return path.join(process.cwd(), "content");
}

function walkContentFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkContentFiles(fullPath);
    if (entry.isFile() && /\.(mdx?|html)$/.test(entry.name)) return [fullPath];
    return [];
  });
}

function excerptFromContent(content: string, format: "markdown" | "html" = "markdown") {
  const plain = format === "html"
    ? content.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ")
    : content.replace(/^# .+$/m, "").replace(/```[\s\S]*?```/g, "").replace(/[#*_`>-]/g, "");

  return plain
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
  return walkContentFiles(dir)
    .map((filePath) => {
      const raw = fs.readFileSync(filePath, "utf8");
      const parsed = matter(raw);
      const data = frontmatterSchema.parse(parsed.data);
      const extension = path.extname(filePath);
      const contentFormat = data.contentFormat ?? (extension === ".html" ? "html" : "markdown");
      const relative = path.relative(dir, filePath).replace(/\.(mdx?|html)$/, "");
      const segments = relative.split(path.sep).filter(Boolean);
      return {
        ...data,
        tags: publicTags(data.tags),
        contentFormat,
        content: parsed.content.trim(),
        excerpt: data.excerpt ?? excerptFromContent(parsed.content, contentFormat),
        href: hrefForEntry(data.type, data.slug),
        pathSegments: segments,
      } satisfies ContentEntry;
    })
    .filter((entry) => entry.type === type)
    .filter((entry) => includeUnpublished || (entry.status === "published" && entry.visibility === "public"))
    .sort((a, b) => Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt));
}

function sortEntries(entries: readonly ContentEntry[]) {
  return [...entries].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return Date.parse(b.publishedAt ?? b.createdAt) - Date.parse(a.publishedAt ?? a.createdAt);
  });
}

function mergeEntries(primary: readonly ContentEntry[], fallback: readonly ContentEntry[], { includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  const seen = new Set<string>();
  const merged: ContentEntry[] = [];

  for (const entry of [...primary, ...fallback]) {
    const key = `${entry.type}:${entry.slug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (entry.status === "archived" && entry.title === "Deleted") continue;
    if (!includeUnpublished && (entry.status !== "published" || entry.visibility !== "public" || entry.content.trim().length === 0)) continue;
    merged.push(entry);
  }

  return sortEntries(merged);
}

export async function getEntriesByTypeAsync(type: ContentType, options: { includeUnpublished?: boolean } = {}) {
  const [remoteEntries] = await Promise.all([
    getRemoteEntriesByType(type, options),
  ]);
  return mergeEntries(remoteEntries, getEntriesByType(type, options), options);
}

export function getEntryByTypeAndSlug(type: ContentType, slug: string, options?: { includeUnpublished?: boolean }) {
  return getEntriesByType(type, options).find((entry) => entry.slug === slug);
}

export async function getEntryByTypeAndSlugAsync(type: ContentType, slug: string, options?: { includeUnpublished?: boolean }) {
  const entries = await getEntriesByTypeAsync(type, options);
  return entries.find((entry) => entry.slug === slug);
}

export function getLatestEntries(limit = 6) {
  return getAllContentEntries().slice(0, limit);
}

export async function getAllContentEntriesAsync({ includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  const entriesByType = await Promise.all(contentTypes.map((type) => getEntriesByTypeAsync(type, { includeUnpublished })));
  return sortEntries(entriesByType.flat());
}

export async function getReplyEntriesForParentAsync(parentType: ContentType, parentSlug: string) {
  return (await getAllContentEntriesAsync())
    .filter((entry) => entry.replyTo?.type === parentType && entry.replyTo.slug === parentSlug);
}

export async function getParentEntryForReplyAsync(entry: Pick<ContentEntry, "replyTo">) {
  if (!entry.replyTo) return undefined;
  return getEntryByTypeAndSlugAsync(entry.replyTo.type, entry.replyTo.slug);
}

export async function getLatestEntriesAsync(limit = 6) {
  return (await getAllContentEntriesAsync()).slice(0, limit);
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

export async function getTopicSubtreeAsync(segments: string[] = []) {
  const prefix = segments.join("/");
  return (await getEntriesByTypeAsync("topic")).filter((entry) => {
    const entryPath = entry.pathSegments.join("/");
    return !prefix || entryPath === prefix || entryPath.startsWith(`${prefix}/`);
  });
}
