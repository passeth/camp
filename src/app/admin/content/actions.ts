"use server";

import { access, mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { contentTypes, type ContentType } from "@/lib/content";
import { markdownToHtmlDocument } from "@/lib/markdown-to-html";
import { canUseRemoteContent, deleteRemoteContent, setRemoteContentPinned, updateRemoteContent } from "@/lib/remote-content-store";

const contentDirByType: Record<ContentType, string> = {
  press: "press",
  topic: "topics",
  "daily-review": "daily-review",
  "study-log": "study-log",
  "camp-session": "camp-session",
  "wall-climb": "wall-climb",
  teach: "teach",
};

const contentInputSchema = z.object({
  originalType: z.enum(contentTypes),
  originalSlug: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  slug: z.string().trim().min(1).max(160).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
  type: z.enum(contentTypes),
  author: z.string().trim().min(1).max(80),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  tags: z.string().trim().max(500).optional(),
  sourceFormat: z.enum(["markdown", "html"]),
  sourceContent: z.string().trim().min(1).max(500000),
  excerpt: z.string().trim().max(240).optional().or(z.literal("")),
  pinned: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  parentType: z.enum(contentTypes).optional().or(z.literal("")),
  parentSlug: z.string().trim().max(160).optional().or(z.literal("")),
});

const deleteInputSchema = z.object({
  type: z.enum(contentTypes),
  slug: z.string().trim().min(1).max(160),
});

const pinInputSchema = z.object({
  type: z.enum(contentTypes),
  slug: z.string().trim().min(1).max(160),
  pinned: z.enum(["true", "false"]).transform((value) => value === "true"),
});

function rootContentDir() {
  return path.join(process.cwd(), "content");
}

function contentDir(type: ContentType) {
  return path.join(rootContentDir(), contentDirByType[type]);
}

function contentPath(type: ContentType, slug: string) {
  return path.join(contentDir(type), `${slug}.html`);
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function findLocalContentPath(type: ContentType, slug: string) {
  const direct = contentPath(type, slug);
  if (await pathExists(direct)) return direct;

  const dir = contentDir(type);
  const candidates = [".md", ".markdown", ".mdx", ".html"].map((extension) => path.join(dir, `${slug}${extension}`));
  for (const candidate of candidates) {
    if (await pathExists(candidate)) return candidate;
  }

  return undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "admin";
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function hrefForType(type: ContentType, slug: string) {
  if (type === "press") return `/press/${slug}`;
  if (type === "topic") return `/topics/${slug}`;
  if (type === "camp-session") return `/camp-session/${slug}`;
  if (type === "wall-climb") return `/wall-climb/${slug}`;
  return `/${type}/${slug}`;
}

function excerptFromContent(content: string) {
  return content
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>|-]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 180);
}

function parseTags(value?: string) {
  return value?.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean) ?? [];
}

function buildContentFile(input: z.infer<typeof contentInputSchema> & { readonly html: string; readonly tagsList: readonly string[] }) {
  const now = new Date().toISOString().slice(0, 10);
  const replyTo = input.parentType && input.parentSlug
    ? `replyTo:\n  type: ${quoteYamlString(input.parentType)}\n  slug: ${quoteYamlString(input.parentSlug)}`
    : undefined;
  const frontmatter = [
    "---",
    `title: ${quoteYamlString(input.title)}`,
    `slug: ${quoteYamlString(input.slug)}`,
    `type: ${quoteYamlString(input.type)}`,
    `contentFormat: "html"`,
    `status: "published"`,
    `visibility: "public"`,
    `author: ${quoteYamlString(input.author)}`,
    `memberSlug: ${quoteYamlString(slugify(input.author))}`,
    input.category ? `category: ${quoteYamlString(input.category)}` : undefined,
    `tags: ${JSON.stringify([...new Set(input.tagsList)])}`,
    `createdAt: ${quoteYamlString(now)}`,
    `updatedAt: ${quoteYamlString(now)}`,
    `publishedAt: ${quoteYamlString(now)}`,
    input.pinned ? "pinned: true" : undefined,
    replyTo,
    `excerpt: ${quoteYamlString(input.excerpt || excerptFromContent(input.html) || "게시글입니다.")}`,
    "---",
  ].filter(Boolean);

  return `${frontmatter.join("\n")}\n\n${input.html.trim()}\n`;
}

async function writeLocalContent(input: z.infer<typeof contentInputSchema> & { readonly html: string; readonly tagsList: readonly string[] }) {
  const oldPath = await findLocalContentPath(input.originalType, input.originalSlug);
  const nextPath = contentPath(input.type, input.slug);

  await mkdir(path.dirname(nextPath), { recursive: true });
  await writeFile(nextPath, buildContentFile(input), "utf8");

  if (oldPath && oldPath !== nextPath) {
    await unlink(oldPath);
  }
}

async function deleteLocalContent(type: ContentType, slug: string) {
  const filePath = await findLocalContentPath(type, slug);
  if (!filePath) return;
  await unlink(filePath);
}

async function setLocalContentPinned(type: ContentType, slug: string, pinned: boolean) {
  const filePath = await findLocalContentPath(type, slug);
  if (!filePath) return;

  const raw = await readFile(filePath, "utf8");
  const parsed = matter(raw);
  const data = {
    ...parsed.data,
    pinned,
  };

  await writeFile(filePath, matter.stringify(parsed.content.trim(), data), "utf8");
}

export async function updateContentPost(formData: FormData) {
  await requireAdmin();

  const parsed = contentInputSchema.safeParse({
    originalType: formData.get("originalType"),
    originalSlug: formData.get("originalSlug"),
    title: formData.get("title"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    author: formData.get("author"),
    category: formData.get("category"),
    tags: formData.get("tags"),
    sourceFormat: formData.get("sourceFormat"),
    sourceContent: formData.get("sourceContent"),
    excerpt: formData.get("excerpt"),
    pinned: formData.get("pinned") ?? "false",
    parentType: formData.get("parentType"),
    parentSlug: formData.get("parentSlug"),
  });

  if (!parsed.success) redirect("/admin/content?error=invalid-input");

  const input = parsed.data;
  const html = input.sourceFormat === "markdown" ? markdownToHtmlDocument(input.sourceContent, input.title) : input.sourceContent;
  const tagsList = parseTags(input.tags);
  const replyTo = input.parentType && input.parentSlug
    ? { type: input.parentType, slug: input.parentSlug }
    : undefined;
  const payload = {
    slug: input.slug,
    type: input.type,
    title: input.title,
    author: input.author,
    memberSlug: slugify(input.author),
    category: input.category || undefined,
    tags: tagsList,
    excerpt: input.excerpt || excerptFromContent(html) || "게시글입니다.",
    html,
    pinned: input.pinned,
    replyTo,
  };

  if (await canUseRemoteContent({ requireWrite: true })) {
    try {
      await updateRemoteContent(input.originalType, input.originalSlug, payload);
    } catch (error) {
      console.error(error);
      if (process.env.VERCEL) redirect("/admin/content?error=remote-update");
    }
  }

  if (!process.env.VERCEL) {
    await writeLocalContent({ ...input, html, tagsList });
  }

  revalidatePath("/");
  revalidatePath(hrefForType(input.type, input.slug));
  redirect(hrefForType(input.type, input.slug));
}

export async function deleteContentPost(formData: FormData) {
  await requireAdmin();

  const parsed = deleteInputSchema.safeParse({
    type: formData.get("type"),
    slug: formData.get("slug"),
  });

  if (!parsed.success) redirect("/admin/content?error=invalid-delete");

  if (await canUseRemoteContent({ requireWrite: true })) {
    try {
      await deleteRemoteContent(parsed.data.type, parsed.data.slug);
    } catch (error) {
      console.error(error);
      if (process.env.VERCEL) redirect("/admin/content?error=remote-delete");
    }
  }

  if (!process.env.VERCEL) {
    await deleteLocalContent(parsed.data.type, parsed.data.slug);
  }

  revalidatePath("/");
  revalidatePath(hrefForType(parsed.data.type, parsed.data.slug));
  redirect("/admin/content?status=deleted");
}

export async function togglePinnedContentPost(formData: FormData) {
  await requireAdmin();

  const parsed = pinInputSchema.safeParse({
    type: formData.get("type"),
    slug: formData.get("slug"),
    pinned: formData.get("pinned"),
  });

  if (!parsed.success) redirect("/admin/content?error=invalid-pin");

  const nextPinned = !parsed.data.pinned;

  if (await canUseRemoteContent({ requireWrite: true })) {
    try {
      await setRemoteContentPinned(parsed.data.type, parsed.data.slug, nextPinned);
    } catch (error) {
      console.error(error);
      if (process.env.VERCEL) redirect("/admin/content?error=remote-pin");
    }
  }

  if (!process.env.VERCEL) {
    await setLocalContentPinned(parsed.data.type, parsed.data.slug, nextPinned);
  }

  revalidatePath("/");
  revalidatePath(hrefForType(parsed.data.type, parsed.data.slug));
  redirect("/admin/content?status=pinned");
}
