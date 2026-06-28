import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiToken } from "@/lib/api-token";
import { contentTypes, type ContentType } from "@/lib/content";
import { markdownToHtmlDocument } from "@/lib/markdown-to-html";
import { canUseRemoteContent, createRemoteContent, remoteContentExists, RemoteContentConflictError } from "@/lib/remote-content-store";

export const runtime = "nodejs";

const publishableTypes = ["press", "study-log", "camp-session", "wall-climb"] as const;
type PublishableType = (typeof publishableTypes)[number];

const tagsSchema = z.union([
  z.array(z.string()),
  z.string(),
]).optional().transform((value) => {
  const rawTags = Array.isArray(value) ? value : (value ?? "").split(",");
  return [...new Set(rawTags.map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean))].slice(0, 20);
});

const publishRequestSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  content: z.string().trim().min(1).max(500_000),
  contentFormat: z.enum(["markdown", "html"]).default("markdown"),
  excerpt: z.string().trim().max(240).optional().or(z.literal("")),
  replyTo: z.object({
    type: z.enum(contentTypes),
    slug: z.string().trim().min(1).max(160),
  }).optional(),
  slug: z.string().trim().max(160).optional().or(z.literal("")),
  tags: tagsSchema,
  title: z.string().trim().min(1).max(120),
  type: z.enum(publishableTypes).default("study-log"),
});

const contentDirByType: Record<PublishableType, string> = {
  press: "press",
  "study-log": "study-log",
  "camp-session": "camp-session",
  "wall-climb": "wall-climb",
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "api-post";
}

function hrefForType(type: PublishableType, slug: string) {
  if (type === "press") return `/press/${slug}`;
  if (type === "camp-session") return `/camp-session/${slug}`;
  if (type === "wall-climb") return `/wall-climb/${slug}`;
  return `/study-log/${slug}`;
}

function contentPath(type: PublishableType, slug: string) {
  return path.join(process.cwd(), "content", contentDirByType[type], `${slug}.html`);
}

async function pathExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function nextSlugCandidate(baseSlug: string, attempt: number) {
  return attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
}

async function uniqueLocalSlug(type: PublishableType, baseSlug: string) {
  let attempt = 0;
  let candidate = nextSlugCandidate(baseSlug, attempt);

  while (await pathExists(contentPath(type, candidate)) || await remoteContentExists(type, candidate)) {
    attempt += 1;
    candidate = nextSlugCandidate(baseSlug, attempt);
  }

  return candidate;
}

function excerptFromContent(content: string, fallback: string) {
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
    .slice(0, 180) || fallback;
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function localContentFile(input: {
  readonly authorName: string;
  readonly category?: string;
  readonly excerpt: string;
  readonly html: string;
  readonly replyTo?: { readonly type: ContentType; readonly slug: string };
  readonly slug: string;
  readonly tags: readonly string[];
  readonly title: string;
  readonly type: PublishableType;
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

async function publishRemote(input: z.infer<typeof publishRequestSchema> & { readonly html: string; readonly baseSlug: string; readonly excerpt: string }) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = nextSlugCandidate(input.baseSlug, attempt);
    try {
      await createRemoteContent({
        title: input.title,
        slug,
        type: input.type,
        author: input.authorName,
        memberSlug: slugify(input.authorName),
        category: input.category || undefined,
        tags: input.tags,
        excerpt: input.excerpt,
        html: input.html,
        replyTo: input.replyTo,
      });
      return slug;
    } catch (error) {
      if (error instanceof RemoteContentConflictError) continue;
      throw error;
    }
  }

  throw new Error("Could not create a unique slug.");
}

export async function POST(request: NextRequest) {
  const authError = verifyApiToken(request);
  if (authError) return authError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const parsed = publishRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const input = parsed.data;
  const html = input.contentFormat === "markdown"
    ? markdownToHtmlDocument(input.content, input.title)
    : input.content;
  const excerpt = input.excerpt || excerptFromContent(input.content, "API로 등록한 게시글입니다.");
  const baseSlug = slugify(input.slug || input.title);

  try {
    const slug = await canUseRemoteContent({ requireWrite: true })
      ? await publishRemote({ ...input, html, baseSlug, excerpt })
      : await uniqueLocalSlug(input.type, baseSlug);

    if (!(await canUseRemoteContent({ requireWrite: true }))) {
      const filePath = contentPath(input.type, slug);
      await mkdir(path.dirname(filePath), { recursive: true });
      await writeFile(filePath, localContentFile({ ...input, html, excerpt, slug }), "utf8");
    }

    const href = hrefForType(input.type, slug);
    revalidatePath("/");
    revalidatePath(href);
    revalidatePath(`/${input.type}`);

    return NextResponse.json({ ok: true, href, slug, type: input.type }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Publish failed." }, { status: 500 });
  }
}
