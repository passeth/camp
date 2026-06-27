import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  note: z.string().trim().min(1).max(2_000),
  url: z.string().trim().url().max(2_000),
});

const deepSeekResponseSchema = z.object({
  title: z.string().trim().min(1).max(120),
  summary: z.string().trim().min(1).max(260),
});

type SourceKind = "github" | "youtube" | "x" | "web";

type SourceContext = {
  readonly canonicalUrl: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly kind: SourceKind;
  readonly text: string;
  readonly title: string;
};

const requestTimeoutMs = 8_000;

function timeoutSignal(ms = requestTimeoutMs) {
  return AbortSignal.timeout(ms);
}

function requireDeepSeekApiKey() {
  const value = process.env.DEEPSEEK_API_KEY;
  if (!value) throw new Error("DeepSeek API key is not configured.");
  return value;
}

function normalizedUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("HTTP 또는 HTTPS 링크만 사용할 수 있습니다.");
  }
  return url;
}

function cleanText(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlAttribute(tag: string, name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const value = new RegExp(`${escaped}=["']([^"']+)["']`, "i").exec(tag)?.[1]?.trim();
  return value
    ?.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, "\"");
}

function htmlMeta(html: string, property: string) {
  const tags = html.match(/<meta[^>]+>/gi) ?? [];
  const tag = tags.find((candidate) => {
    const key = htmlAttribute(candidate, "property") ?? htmlAttribute(candidate, "name");
    return key?.toLowerCase() === property.toLowerCase();
  });
  return tag ? htmlAttribute(tag, "content") : undefined;
}

function htmlTitle(html: string) {
  return htmlMeta(html, "og:title") ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
}

function absoluteUrl(value: string | undefined, base: URL) {
  if (!value) return undefined;
  try {
    return new URL(value, base).toString();
  } catch {
    return undefined;
  }
}

function youtubeVideoId(url: URL) {
  if (url.hostname === "youtu.be") return url.pathname.split("/").filter(Boolean)[0];
  if (url.hostname.endsWith("youtube.com")) return url.searchParams.get("v") ?? url.pathname.match(/\/shorts\/([^/?#]+)/)?.[1];
  return undefined;
}

function githubRepoParts(url: URL) {
  if (url.hostname !== "github.com" && url.hostname !== "www.github.com") return undefined;
  const [owner, repo] = url.pathname.split("/").filter(Boolean);
  if (!owner || !repo) return undefined;
  return { owner, repo: repo.replace(/\.git$/i, "") };
}

function isXUrl(url: URL) {
  return ["x.com", "www.x.com", "twitter.com", "www.twitter.com"].includes(url.hostname);
}

async function fetchJson(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Camp-Wall-Climb",
      ...(headers ?? {}),
    },
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return response.json();
}

async function fetchText(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,text/plain,application/json",
      "User-Agent": "Camp-Wall-Climb",
      ...(headers ?? {}),
    },
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return response.text();
}

async function githubSource(url: URL): Promise<SourceContext | undefined> {
  const repo = githubRepoParts(url);
  if (!repo) return undefined;

  const headers = process.env.GITHUB_CONTENT_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_CONTENT_TOKEN}` }
    : undefined;

  const repoSchema = z.object({
    description: z.string().nullable(),
    forks_count: z.number(),
    full_name: z.string(),
    html_url: z.string(),
    language: z.string().nullable(),
    stargazers_count: z.number(),
    topics: z.array(z.string()).optional(),
  });
  const repoData = repoSchema.parse(await fetchJson(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, headers));
  return {
    canonicalUrl: repoData.html_url,
    description: repoData.description ?? undefined,
    imageUrl: `https://opengraph.githubassets.com/camp/${encodeURIComponent(repo.owner)}/${encodeURIComponent(repo.repo)}`,
    kind: "github",
    text: [
      `Repository: ${repoData.full_name}`,
      repoData.description ? `Description: ${repoData.description}` : undefined,
      repoData.language ? `Language: ${repoData.language}` : undefined,
      `Stars: ${repoData.stargazers_count}`,
      `Forks: ${repoData.forks_count}`,
      repoData.topics?.length ? `Topics: ${repoData.topics.join(", ")}` : undefined,
    ].filter(Boolean).join("\n"),
    title: repoData.full_name,
  };
}

async function youtubeSource(url: URL): Promise<SourceContext | undefined> {
  const videoId = youtubeVideoId(url);
  if (!videoId) return undefined;

  const canonicalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oembedSchema = z.object({
    author_name: z.string(),
    provider_name: z.string(),
    title: z.string(),
  });
  const oembed = oembedSchema.parse(await fetchJson(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`));
  return {
    canonicalUrl,
    description: `${oembed.provider_name} 영상`,
    imageUrl: `https://img.youtube.com/vi/${encodeURIComponent(videoId)}/hqdefault.jpg`,
    kind: "youtube",
    text: [`Title: ${oembed.title}`, `Channel: ${oembed.author_name}`, `URL: ${canonicalUrl}`].join("\n"),
    title: oembed.title,
  };
}

async function xSource(url: URL): Promise<SourceContext | undefined> {
  if (!isXUrl(url)) return undefined;
  const author = url.pathname.split("/").filter(Boolean)[0];
  try {
    const html = await fetchText(url.toString());
    return {
      canonicalUrl: url.toString(),
      description: htmlMeta(html, "og:description") ?? htmlMeta(html, "twitter:description") ?? "X 링크",
      imageUrl: absoluteUrl(htmlMeta(html, "og:image") ?? htmlMeta(html, "twitter:image"), url),
      kind: "x",
      text: cleanText(html).slice(0, 3_000),
      title: htmlTitle(html) ?? (author ? `X post by @${author}` : "X post"),
    };
  } catch {
    return xFallbackSource(url, author);
  }
}

function xFallbackSource(url: URL, author: string | undefined): SourceContext {
  return {
    canonicalUrl: url.toString(),
    description: "X 링크",
    kind: "x",
    text: [author ? `Author: @${author}` : undefined, `URL: ${url.toString()}`].filter(Boolean).join("\n"),
    title: author ? `X post by @${author}` : "X post",
  };
}

async function webSource(url: URL): Promise<SourceContext> {
  const html = await fetchText(url.toString());
  const title = htmlTitle(html) ?? url.hostname.replace(/^www\./, "");
  const description = htmlMeta(html, "description") ?? htmlMeta(html, "og:description");
  const imageUrl = absoluteUrl(htmlMeta(html, "og:image") ?? htmlMeta(html, "twitter:image"), url);
  return {
    canonicalUrl: url.toString(),
    description,
    imageUrl,
    kind: "web",
    text: cleanText(html).slice(0, 5_000),
    title,
  };
}

async function sourceForUrl(url: URL) {
  return await githubSource(url) ?? await youtubeSource(url) ?? await xSource(url) ?? await webSource(url);
}

async function summarize(source: SourceContext, note: string) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireDeepSeekApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      reasoning_effort: "high",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return only valid JSON with keys title and summary. Write compact Korean for a shared-link board. Analyze the linked source itself: its metadata, title, description, and available source context. The user's shared note is only optional context and must not become the main subject. Do not invent facts.",
        },
        {
          role: "user",
          content: [
            `User shared note, optional context only: ${note}`,
            `Source kind: ${source.kind}`,
            `URL: ${source.canonicalUrl}`,
            `Title: ${source.title}`,
            source.description ? `Description: ${source.description}` : undefined,
            "",
            "Create a Korean title and one-sentence summary under 180 Korean characters based on the linked source. The summary should explain what the link is about, not analyze the user's comment.",
            "",
            source.text,
          ].filter(Boolean).join("\n"),
        },
      ],
    }),
    signal: timeoutSignal(55_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${text.slice(0, 300)}`);
  }

  const payloadSchema = z.object({
    choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1),
  });
  const payload = payloadSchema.parse(await response.json());
  const content = payload.choices[0].message.content;
  const jsonText = content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content;
  return deepSeekResponseSchema.parse(JSON.parse(jsonText));
}

export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "링크와 멘트를 확인해 주세요." }, { status: 400 });
    }

    const source = await sourceForUrl(normalizedUrl(parsed.data.url));
    const summary = await summarize(source, parsed.data.note);
    return NextResponse.json({
      summary: {
        canonicalUrl: source.canonicalUrl,
        imageUrl: source.imageUrl,
        kind: source.kind,
        summary: summary.summary,
        title: source.title,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "요약을 만들지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
