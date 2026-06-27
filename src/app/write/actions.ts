"use server";

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { z } from "zod";
import { contentTypes, type ContentType } from "@/lib/content";
import { markdownToHtmlDocument } from "@/lib/markdown-to-html";
import { canUseRemoteContent, createRemoteContent, remoteContentExists } from "@/lib/remote-content-store";

const publishMenus = ["press", "topic", "study-log", "camp-session"] as const;
type PublishMenu = (typeof publishMenus)[number];

const contentDirByMenu: Record<PublishMenu, string> = {
  press: "press",
  topic: "topics",
  "study-log": "study-log",
  "camp-session": "camp-session",
};

const publishRequestSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(160).optional().or(z.literal("")),
  type: z.enum(publishMenus).default("study-log"),
  category: z.string().max(80).optional(),
  uploadFormat: z.enum(["markdown", "html"]),
  tags: z.string().optional(),
  generatedMarkdown: z.string().max(500000).optional(),
  sourceUrl: z.string().trim().url().max(2000).optional().or(z.literal("")),
  parentType: z.enum(contentTypes).optional(),
  parentSlug: z.string().trim().min(1).max(160).optional(),
});

const finalPublishRequestSchema = publishRequestSchema.extend({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
  contentFormat: z.literal("html"),
  markdown: z.string().min(1).max(500000),
  html: z.string().min(1).max(500000),
});

function getUploadFile(formData: FormData) {
  const file = formData.get("contentFile");
  return file instanceof File && file.size > 0 ? file : null;
}

function optionalFormText(formData: FormData, name: string) {
  const value = formData.get(name);
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function basename(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function titleFromFile(fileName: string) {
  return basename(fileName).replace(/[-_]+/g, " ") || "Untitled";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "uploaded-post";
}

function fileMatchesFormat(fileName: string, format: "markdown" | "html") {
  if (format === "html") return /\.html?$/i.test(fileName);
  return /\.(md|markdown)$/i.test(fileName);
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function contentPath(type: PublishMenu, slug: string) {
  return path.join(process.cwd(), "content", contentDirByMenu[type], `${slug}.html`);
}

async function uniqueSlug(type: PublishMenu, slug: string) {
  let candidate = slug;
  let suffix = 2;

  while (await pathExists(contentPath(type, candidate)) || await remoteContentExists(type, candidate)) {
    candidate = `${slug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function hrefForType(type: PublishMenu, slug: string) {
  if (type === "press") return `/press/${slug}`;
  if (type === "topic") return `/topics/${slug}`;
  if (type === "camp-session") return `/camp-session/${slug}`;
  return `/study-log/${slug}`;
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function excerptFromSource(content: string) {
  return content
    .replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[#*_`>-]/g, " ")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 180) || "업로드한 게시글입니다.";
}

function buildPublishedContentFile(input: {
  readonly title: string;
  readonly slug: string;
  readonly type: PublishMenu;
  readonly authorName: string;
  readonly category?: string;
  readonly tags: readonly string[];
  readonly excerpt: string;
  readonly html: string;
  readonly replyTo?: {
    readonly type: ContentType;
    readonly slug: string;
  };
}) {
  const now = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    "---",
    `title: ${quoteYamlString(input.title)}`,
    `slug: ${quoteYamlString(input.slug)}`,
    `type: ${quoteYamlString(input.type)}`,
    `contentFormat: "html"`,
    `status: "published"`,
    `visibility: "public"`,
    `author: ${quoteYamlString(input.authorName)}`,
    `memberSlug: ${quoteYamlString(slugify(input.authorName))}`,
    input.category ? `category: ${quoteYamlString(input.category)}` : undefined,
    `tags: ${JSON.stringify([...new Set(input.tags)])}`,
    `createdAt: ${quoteYamlString(now)}`,
    `updatedAt: ${quoteYamlString(now)}`,
    `publishedAt: ${quoteYamlString(now)}`,
    input.replyTo ? `replyTo:\n  type: ${quoteYamlString(input.replyTo.type)}\n  slug: ${quoteYamlString(input.replyTo.slug)}` : undefined,
    `excerpt: ${quoteYamlString(input.excerpt)}`,
    "---",
  ].filter(Boolean);

  return `${frontmatter.join("\n")}\n\n${input.html.trim()}\n`;
}

export async function createPublishPost(formData: FormData) {
  const uploadFile = getUploadFile(formData);

  const parsed = publishRequestSchema.safeParse({
    authorName: formData.get("authorName"),
    title: formData.get("title"),
    slug: optionalFormText(formData, "slug"),
    type: optionalFormText(formData, "type"),
    category: optionalFormText(formData, "category"),
    uploadFormat: formData.get("uploadFormat"),
    tags: optionalFormText(formData, "tags"),
    generatedMarkdown: optionalFormText(formData, "generatedMarkdown"),
    sourceUrl: optionalFormText(formData, "sourceUrl"),
    parentType: optionalFormText(formData, "parentType"),
    parentSlug: optionalFormText(formData, "parentSlug"),
  });

  if (!parsed.success) redirect("/write?error=invalid-input");
  if (!uploadFile && !parsed.data.generatedMarkdown) redirect("/write?error=invalid-input");
  if (uploadFile && !fileMatchesFormat(uploadFile.name, parsed.data.uploadFormat)) redirect("/write?error=invalid-input");

  const sourceContent = uploadFile ? await uploadFile.text() : parsed.data.generatedMarkdown!;
  const sourceFormat = uploadFile ? parsed.data.uploadFormat : "markdown";
  const baseTitle = parsed.data.title || (uploadFile ? titleFromFile(uploadFile.name) : "링크 정리");
  const baseSlug = parsed.data.slug || slugify(baseTitle || (uploadFile ? basename(uploadFile.name) : "link-draft"));
  const slug = await uniqueSlug(parsed.data.type, baseSlug);
  const html = sourceFormat === "markdown"
    ? markdownToHtmlDocument(sourceContent, baseTitle)
    : sourceContent;
  const finalParsed = finalPublishRequestSchema.safeParse({
    ...parsed.data,
    title: baseTitle,
    slug,
    contentFormat: "html",
    markdown: sourceContent,
    html,
  });

  if (!finalParsed.success) redirect("/write?error=invalid-input");

  const submission = finalParsed.data;
  const tags = parsed.data.tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [];
  const excerpt = excerptFromSource(submission.markdown);
  const replyTo = submission.parentType && submission.parentSlug
    ? { type: submission.parentType, slug: submission.parentSlug }
    : undefined;

  if (await canUseRemoteContent({ requireWrite: true })) {
    let remotePublished = false;
    try {
      await createRemoteContent({
        title: submission.title,
        slug: submission.slug,
        type: submission.type,
        author: submission.authorName,
        memberSlug: slugify(submission.authorName),
        category: submission.category,
        tags,
        excerpt,
        html: submission.html,
        replyTo,
      });
      remotePublished = true;
    } catch (error) {
      console.error(error);
    }
    if (process.env.VERCEL) {
      redirect(remotePublished ? hrefForType(submission.type, submission.slug) : "/write?error=remote-publish");
    }
  } else if (process.env.VERCEL) {
    redirect("/write?error=remote-publish");
  }

  const filePath = contentPath(submission.type, submission.slug);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(
    filePath,
    buildPublishedContentFile({
      title: submission.title,
      slug: submission.slug,
      type: submission.type,
      authorName: submission.authorName,
      category: submission.category,
      tags,
      excerpt,
      html: submission.html,
      replyTo,
    }),
    "utf8",
  );

  redirect(hrefForType(submission.type, submission.slug));
}
