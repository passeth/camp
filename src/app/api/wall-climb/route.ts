import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyApiToken } from "@/lib/api-token";
import { canUseRemoteContent, createRemoteContent, remoteContentExists, RemoteContentConflictError } from "@/lib/remote-content-store";

export const runtime = "nodejs";

const wallRequestSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  canonicalUrl: z.string().trim().url().max(2_000).optional().or(z.literal("")),
  note: z.string().trim().min(1).max(2_000),
  sourceImage: z.string().trim().url().max(2_000).optional().or(z.literal("")),
  sourceKind: z.enum(["github", "youtube", "x", "web"]).optional().or(z.literal("")),
  sourceTitle: z.string().trim().min(1).max(160).optional().or(z.literal("")),
  sourceUrl: z.string().trim().url().max(2_000),
  summary: z.string().trim().min(1).max(500).optional().or(z.literal("")),
  tags: z.union([z.array(z.string()), z.string()]).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "wall-link";
}

function titleFromNote(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean)
    ?.slice(0, 80) || value.trim().slice(0, 80) || "벽타기 링크";
}

function githubPreviewImage(value: string) {
  try {
    const url = new URL(value);
    if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return undefined;
    const [owner, repo] = url.pathname.split("/").filter(Boolean);
    if (!owner || !repo) return undefined;
    return `https://opengraph.githubassets.com/camp/${encodeURIComponent(owner)}/${encodeURIComponent(repo.replace(/\.git$/i, ""))}`;
  } catch {
    return undefined;
  }
}

function youtubePreviewImage(value: string) {
  try {
    const url = new URL(value);
    const videoId = url.hostname === "youtu.be"
      ? url.pathname.split("/").filter(Boolean)[0]
      : url.hostname.endsWith("youtube.com")
        ? url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/?#]+)/)?.[1]
        : undefined;
    return videoId ? `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg` : undefined;
  } catch {
    return undefined;
  }
}

function fallbackPreviewImage(value: string) {
  return githubPreviewImage(value) ?? youtubePreviewImage(value);
}

function tagsFromInput(value: z.infer<typeof wallRequestSchema>["tags"], sourceKind: "github" | "youtube" | "x" | "web") {
  const rawTags = Array.isArray(value) ? value : (value ?? "").split(/[,\s]+/);
  const userTags = rawTags.map((tag) => tag.trim().replace(/^#+/, "")).filter(Boolean);
  return [...new Set(["벽타기", sourceKind, ...userTags])].slice(0, 20);
}

function quoteYamlString(value: string) {
  return JSON.stringify(value);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function contentPath(slug: string) {
  return path.join(process.cwd(), "content", "wall-climb", `${slug}.html`);
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

async function uniqueLocalSlug(baseSlug: string) {
  let attempt = 0;
  let candidate = nextSlugCandidate(baseSlug, attempt);

  while (await pathExists(contentPath(candidate)) || await remoteContentExists("wall-climb", candidate)) {
    attempt += 1;
    candidate = nextSlugCandidate(baseSlug, attempt);
  }

  return candidate;
}

function htmlForWallEntry(input: {
  readonly note: string;
  readonly sourceImage?: string;
  readonly sourceKind: "github" | "youtube" | "x" | "web";
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly summary: string;
  readonly title: string;
}) {
  return [
    "<!doctype html>",
    "<html lang=\"ko\">",
    "<head>",
    "  <meta charset=\"utf-8\" />",
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />",
    `  <title>${escapeHtml(input.title)}</title>`,
    "</head>",
    "<body>",
    `  <article class="wall-climb-entry" data-source-url="${escapeHtml(input.sourceUrl)}" data-source-title="${escapeHtml(input.sourceTitle)}" data-source-kind="${input.sourceKind}"${input.sourceImage ? ` data-source-image="${escapeHtml(input.sourceImage)}"` : ""}>`,
    `    <p data-wall-note>${escapeHtml(input.note)}</p>`,
    `    <p data-wall-summary>${escapeHtml(input.summary)}</p>`,
    "  </article>",
    "</body>",
    "</html>",
  ].join("\n");
}

function contentFile(input: {
  readonly authorName: string;
  readonly html: string;
  readonly note: string;
  readonly slug: string;
  readonly sourceImage?: string;
  readonly sourceKind: "github" | "youtube" | "x" | "web";
  readonly sourceTitle: string;
  readonly sourceUrl: string;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly title: string;
}) {
  const now = new Date().toISOString().slice(0, 10);
  const frontmatter = [
    "---",
    `title: ${quoteYamlString(input.title)}`,
    `slug: ${quoteYamlString(input.slug)}`,
    `type: "wall-climb"`,
    `contentFormat: "html"`,
    `status: "published"`,
    `visibility: "public"`,
    `author: ${quoteYamlString(input.authorName)}`,
    `memberSlug: ${quoteYamlString(slugify(input.authorName))}`,
    `category: "wall-climb"`,
    `tags: ${JSON.stringify(input.tags)}`,
    `createdAt: ${quoteYamlString(now)}`,
    `updatedAt: ${quoteYamlString(now)}`,
    `publishedAt: ${quoteYamlString(now)}`,
    `sourceUrl: ${quoteYamlString(input.sourceUrl)}`,
    input.sourceImage ? `sourceImage: ${quoteYamlString(input.sourceImage)}` : undefined,
    `sourceTitle: ${quoteYamlString(input.sourceTitle)}`,
    `sourceKind: ${quoteYamlString(input.sourceKind)}`,
    `note: ${quoteYamlString(input.note)}`,
    `summary: ${quoteYamlString(input.summary)}`,
    `excerpt: ${quoteYamlString(input.summary)}`,
    "---",
  ].filter(Boolean);

  return `${frontmatter.join("\n")}\n\n${input.html}\n`;
}

async function publishRemote(input: {
  readonly authorName: string;
  readonly baseSlug: string;
  readonly html: string;
  readonly summary: string;
  readonly tags: readonly string[];
  readonly title: string;
}) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const slug = nextSlugCandidate(input.baseSlug, attempt);
    try {
      await createRemoteContent({
        title: input.title,
        slug,
        type: "wall-climb",
        author: input.authorName,
        memberSlug: slugify(input.authorName),
        category: "wall-climb",
        tags: input.tags,
        excerpt: input.summary,
        html: input.html,
      });
      return slug;
    } catch (error) {
      if (error instanceof RemoteContentConflictError) continue;
      throw error;
    }
  }

  throw new Error("Could not create a unique wall-climb slug.");
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

  const parsed = wallRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const input = parsed.data;
  const sourceUrl = input.canonicalUrl || input.sourceUrl;
  const sourceKind = input.sourceKind || "web";
  const sourceImage = input.sourceImage || fallbackPreviewImage(sourceUrl);
  const sourceTitle = input.sourceTitle || sourceUrl;
  const summary = input.summary || input.note;
  const tags = tagsFromInput(input.tags, sourceKind);
  const title = titleFromNote(input.note);
  const baseSlug = slugify(title);
  const html = htmlForWallEntry({
    note: input.note,
    sourceImage,
    sourceKind,
    sourceTitle,
    sourceUrl,
    summary,
    title,
  });

  try {
    const slug = await canUseRemoteContent({ requireWrite: true })
      ? await publishRemote({ authorName: input.authorName, baseSlug, html, summary, tags, title })
      : await uniqueLocalSlug(baseSlug);

    if (!(await canUseRemoteContent({ requireWrite: true }))) {
      await mkdir(path.dirname(contentPath(slug)), { recursive: true });
      await writeFile(
        contentPath(slug),
        contentFile({
          authorName: input.authorName,
          html,
          note: input.note,
          slug,
          sourceImage,
          sourceKind,
          sourceTitle,
          sourceUrl,
          summary,
          tags,
          title,
        }),
        "utf8",
      );
    }

    const href = `/wall-climb/${slug}`;
    revalidatePath("/");
    revalidatePath("/wall-climb");
    revalidatePath(href);

    return NextResponse.json({ ok: true, href, slug, type: "wall-climb" }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Wall-climb publish failed." }, { status: 500 });
  }
}
