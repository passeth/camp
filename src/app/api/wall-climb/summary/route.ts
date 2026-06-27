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

function htmlMeta(html: string, property: string) {
  const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i");
  return pattern.exec(html)?.[1]?.trim();
}

function htmlTitle(html: string) {
  return htmlMeta(html, "og:title") ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
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
    kind: "youtube",
    text: [`Title: ${oembed.title}`, `Channel: ${oembed.author_name}`, `URL: ${canonicalUrl}`].join("\n"),
    title: oembed.title,
  };
}

function xSource(url: URL): SourceContext | undefined {
  if (!isXUrl(url)) return undefined;
  const author = url.pathname.split("/").filter(Boolean)[0];
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
  return {
    canonicalUrl: url.toString(),
    description,
    kind: "web",
    text: cleanText(html).slice(0, 5_000),
    title,
  };
}

async function sourceForUrl(url: URL) {
  return await githubSource(url) ?? await youtubeSource(url) ?? xSource(url) ?? await webSource(url);
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
          content: "Return only valid JSON with keys title and summary. Write compact Korean for a link collection list. Do not invent facts.",
        },
        {
          role: "user",
          content: [
            `Shared note: ${note}`,
            `Source kind: ${source.kind}`,
            `URL: ${source.canonicalUrl}`,
            `Title: ${source.title}`,
            source.description ? `Description: ${source.description}` : undefined,
            "",
            "Create a clear Korean title and a one-sentence summary under 180 Korean characters.",
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
        kind: source.kind,
        summary: summary.summary,
        title: summary.title || source.title,
      },
    });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "요약을 만들지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
