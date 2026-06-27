"use server";

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canUseRemoteContent, createRemoteContent, remoteContentExists, RemoteContentConflictError } from "@/lib/remote-content-store";

const wallInputSchema = z.object({
  authorName: z.string().trim().min(1).max(80),
  canonicalUrl: z.string().trim().url().max(2_000).optional().or(z.literal("")),
  note: z.string().trim().min(1).max(2_000),
  sourceKind: z.enum(["github", "youtube", "x", "web"]).optional().or(z.literal("")),
  sourceImage: z.string().trim().url().max(2_000).optional().or(z.literal("")),
  sourceTitle: z.string().trim().min(1).max(160).optional().or(z.literal("")),
  sourceUrl: z.string().trim().url().max(2_000),
  summary: z.string().trim().min(1).max(500).optional().or(z.literal("")),
  tags: z.string().trim().max(300).optional().or(z.literal("")),
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

function tagsFromInput(value: string | undefined, sourceKind: "github" | "youtube" | "x" | "web") {
  const userTags = (value ?? "")
    .split(/[,\s]+/)
    .map((tag) => tag.trim().replace(/^#+/, ""))
    .filter(Boolean);
  return [...new Set(["벽타기", sourceKind, ...userTags])];
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

async function uniqueSlug(baseSlug: string) {
  let candidate = baseSlug;
  let suffix = 2;

  while (await pathExists(contentPath(candidate)) || await remoteContentExists("wall-climb", candidate)) {
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function nextSlugCandidate(baseSlug: string, attempt: number) {
  return attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
}

function htmlForWallEntry(input: {
  readonly note: string;
  readonly sourceKind: "github" | "youtube" | "x" | "web";
  readonly sourceImage?: string;
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
    "  <style>",
    "    body { margin: 0; background: #fff; color: #171717; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }",
    "    main { width: min(760px, calc(100% - 40px)); margin: 0 auto; padding: 48px 0 64px; }",
    "    .wall-climb-entry { display: grid; gap: 20px; }",
    "    a { color: #1d6f8f; font-weight: 700; overflow-wrap: anywhere; }",
    "    section { border: 1px solid #e7e5dc; border-radius: 12px; padding: 20px; }",
    "    p { margin: 0; color: #424a57; line-height: 1.8; }",
    "    .label { color: #6d7280; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }",
    "  </style>",
    "</head>",
    "<body>",
    "  <main>",
    `    <article class="wall-climb-entry" data-source-url="${escapeHtml(input.sourceUrl)}" data-source-title="${escapeHtml(input.sourceTitle)}" data-source-kind="${input.sourceKind}"${input.sourceImage ? ` data-source-image="${escapeHtml(input.sourceImage)}"` : ""}>`,
    "      <section>",
    "        <p class=\"label\">Original link</p>",
    `        <a href="${escapeHtml(input.sourceUrl)}" target="_blank" rel="noreferrer">${escapeHtml(input.sourceTitle)}</a>`,
    "      </section>",
    "      <section>",
    "        <p class=\"label\">Shared note</p>",
    `        <p data-wall-note>${escapeHtml(input.note)}</p>`,
    "      </section>",
    "      <section>",
    "        <p class=\"label\">DeepSeek summary</p>",
    `        <p data-wall-summary>${escapeHtml(input.summary)}</p>`,
    "      </section>",
    "    </article>",
    "  </main>",
    "</body>",
    "</html>",
  ].join("\n");
}

function contentFile(input: {
  readonly authorName: string;
  readonly html: string;
  readonly note: string;
  readonly slug: string;
  readonly sourceKind: "github" | "youtube" | "x" | "web";
  readonly sourceImage?: string;
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

export async function createWallClimbPost(formData: FormData) {
  const parsed = wallInputSchema.safeParse({
    authorName: formData.get("authorName"),
    canonicalUrl: formData.get("canonicalUrl"),
    note: formData.get("note"),
    sourceKind: formData.get("sourceKind"),
    sourceImage: formData.get("sourceImage"),
    sourceTitle: formData.get("sourceTitle"),
    sourceUrl: formData.get("sourceUrl"),
    summary: formData.get("summary"),
    tags: formData.get("tags"),
  });

  if (!parsed.success) redirect("/wall-climb?error=invalid-input");

  const input = parsed.data;
  const sourceUrl = input.canonicalUrl || input.sourceUrl;
  const sourceKind = input.sourceKind || "web";
  const sourceImage = input.sourceImage || fallbackPreviewImage(sourceUrl);
  const sourceTitle = input.sourceTitle || sourceUrl;
  const summary = input.summary || input.note;
  const tags = tagsFromInput(input.tags, sourceKind);
  const title = titleFromNote(input.note);
  const baseSlug = slugify(title);
  const slug = await uniqueSlug(baseSlug);
  const html = htmlForWallEntry({
    note: input.note,
    sourceKind,
    sourceImage,
    sourceTitle,
    sourceUrl,
    summary,
    title,
  });

  if (await canUseRemoteContent({ requireWrite: true })) {
    let remotePublishedSlug: string | undefined;
    try {
      for (let attempt = 0; attempt < 20; attempt += 1) {
        const candidateSlug = nextSlugCandidate(baseSlug, attempt);
        try {
          await createRemoteContent({
            title,
            slug: candidateSlug,
            type: "wall-climb",
            author: input.authorName,
            memberSlug: slugify(input.authorName),
            category: "wall-climb",
            tags,
            excerpt: summary,
            html,
          });
          remotePublishedSlug = candidateSlug;
          break;
        } catch (error) {
          if (error instanceof RemoteContentConflictError) continue;
          throw error;
        }
      }
      if (!remotePublishedSlug) throw new Error("사용 가능한 벽타기 주소를 만들지 못했습니다.");
    } catch (error) {
      console.error(error);
      if (process.env.VERCEL) redirect("/wall-climb?error=remote-publish");
    }
    if (process.env.VERCEL) redirect("/wall-climb?status=published");
  } else if (process.env.VERCEL) {
    redirect("/wall-climb?error=remote-publish");
  }

  const finalSlug = slug;
  await mkdir(path.dirname(contentPath(finalSlug)), { recursive: true });
  await writeFile(
    contentPath(finalSlug),
    contentFile({
      authorName: input.authorName,
      html,
      note: input.note,
      slug: finalSlug,
      sourceKind,
      sourceImage,
      sourceTitle,
      sourceUrl,
      summary,
      tags,
      title,
    }),
    "utf8",
  );

  revalidatePath("/wall-climb");
  redirect("/wall-climb?status=published");
}
