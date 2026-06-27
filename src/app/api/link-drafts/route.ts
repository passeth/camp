import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

const requestSchema = z.object({
  url: z.string().trim().url().max(2_000),
});

const draftSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: z.string().trim().max(80).optional().default("AI Tools"),
  tags: z.array(z.string().trim().min(1).max(32)).default([]).transform((tags) => [...new Set(tags)].slice(0, 8)),
  markdown: z.string().trim().min(40).max(30_000),
});

type SourceSummary = {
  readonly kind: "github" | "youtube" | "web";
  readonly url: string;
  readonly title?: string;
  readonly description?: string;
  readonly author?: string;
  readonly text: string;
};

const requestTimeoutMs = 8_000;
const sourceTextLimit = 24_000;

function requireDeepSeekApiKey() {
  const value = process.env.DEEPSEEK_API_KEY;
  if (!value) throw new Error("DeepSeek API key is not configured.");
  return value;
}

function timeoutSignal(ms = requestTimeoutMs) {
  return AbortSignal.timeout(ms);
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
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
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

async function fetchJson<T>(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Camp-Link-Draft",
      ...(headers ?? {}),
    },
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return (await response.json()) as T;
}

async function fetchText(url: string, headers?: HeadersInit) {
  const response = await fetch(url, {
    headers: {
      Accept: "text/html,text/plain,application/json",
      "User-Agent": "Camp-Link-Draft",
      ...(headers ?? {}),
    },
    signal: timeoutSignal(),
  });
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
  return response.text();
}

async function githubSource(url: URL): Promise<SourceSummary | null> {
  const repo = githubRepoParts(url);
  if (!repo) return null;

  const headers = process.env.GITHUB_CONTENT_TOKEN
    ? { Authorization: `Bearer ${process.env.GITHUB_CONTENT_TOKEN}` }
    : undefined;

  type RepoResponse = {
    readonly full_name: string;
    readonly description: string | null;
    readonly html_url: string;
    readonly stargazers_count: number;
    readonly forks_count: number;
    readonly language: string | null;
    readonly topics?: readonly string[];
  };

  const repoData = await fetchJson<RepoResponse>(`https://api.github.com/repos/${repo.owner}/${repo.repo}`, headers);
  let readme = "";

  try {
    type ReadmeResponse = { readonly download_url: string | null };
    const readmeData = await fetchJson<ReadmeResponse>(`https://api.github.com/repos/${repo.owner}/${repo.repo}/readme`, headers);
    if (readmeData.download_url) {
      readme = await fetchText(readmeData.download_url, headers);
    }
  } catch {
    readme = "";
  }

  const stats = [
    `Repository: ${repoData.full_name}`,
    repoData.description ? `Description: ${repoData.description}` : undefined,
    repoData.language ? `Language: ${repoData.language}` : undefined,
    `Stars: ${repoData.stargazers_count}`,
    `Forks: ${repoData.forks_count}`,
    repoData.topics?.length ? `Topics: ${repoData.topics.join(", ")}` : undefined,
  ].filter(Boolean).join("\n");

  return {
    kind: "github",
    url: repoData.html_url,
    title: repoData.full_name,
    description: repoData.description ?? undefined,
    text: `${stats}\n\nREADME:\n${readme}`.slice(0, sourceTextLimit),
  };
}

async function youtubeSource(url: URL): Promise<SourceSummary | null> {
  const videoId = youtubeVideoId(url);
  if (!videoId) return null;

  type OEmbedResponse = {
    readonly title: string;
    readonly author_name: string;
    readonly provider_name: string;
  };

  const canonicalUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const oembed = await fetchJson<OEmbedResponse>(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(canonicalUrl)}&format=json`,
  );

  return {
    kind: "youtube",
    url: canonicalUrl,
    title: oembed.title,
    author: oembed.author_name,
    description: `${oembed.provider_name} 영상입니다. 자막 API가 연결되지 않은 경우 제목과 채널 정보를 중심으로 정리합니다.`,
    text: [
      `Title: ${oembed.title}`,
      `Channel: ${oembed.author_name}`,
      `URL: ${canonicalUrl}`,
      "Transcript: not provided by this link-only flow.",
    ].join("\n"),
  };
}

async function webSource(url: URL): Promise<SourceSummary> {
  const html = await fetchText(url.toString());
  const title = htmlTitle(html);
  const description = htmlMeta(html, "description") ?? htmlMeta(html, "og:description");
  return {
    kind: "web",
    url: url.toString(),
    title,
    description,
    text: cleanText(html).slice(0, sourceTextLimit),
  };
}

async function summarizeSource(source: SourceSummary) {
  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${requireDeepSeekApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "deepseek-v4-pro",
      reasoning_effort: "high",
      thinking: { type: "enabled" },
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: [
            "You write concise Korean community posts for a study archive.",
            "Return only valid JSON with keys: title, category, tags, markdown.",
            "The markdown must be a polished post template, not a raw summary.",
            "Use plain Korean. Do not invent facts not present in the source.",
          ].join(" "),
        },
        {
          role: "user",
          content: [
            `Source type: ${source.kind}`,
            `URL: ${source.url}`,
            source.title ? `Title: ${source.title}` : undefined,
            source.author ? `Author/channel: ${source.author}` : undefined,
            source.description ? `Description: ${source.description}` : undefined,
            "",
            "Write a markdown post with this structure:",
            "# 제목",
            "",
            "## 한 줄 요약",
            "## 핵심 내용",
            "## 스터디에서 볼 포인트",
            "## 같이 보면 좋은 질문",
            "## 원문 링크",
            "",
            "Source text:",
            source.text.slice(0, sourceTextLimit),
          ].filter(Boolean).join("\n"),
        },
      ],
    }),
    signal: timeoutSignal(30_000),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`DeepSeek API error: ${response.status} ${text.slice(0, 300)}`);
  }

  const payload = await response.json() as {
    readonly choices?: readonly [{ readonly message?: { readonly content?: string } }];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek response did not include content.");

  const jsonText = content.match(/```json\s*([\s\S]*?)```/i)?.[1] ?? content;
  return draftSchema.parse(JSON.parse(jsonText));
}

export async function POST(request: NextRequest) {
  try {
    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "링크 형식이 올바르지 않습니다." }, { status: 400 });
    }

    const url = normalizedUrl(parsed.data.url);
    const source = await githubSource(url) ?? await youtubeSource(url) ?? await webSource(url);
    const draft = await summarizeSource(source);

    return NextResponse.json({ draft, source: { kind: source.kind, url: source.url, title: source.title } });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "초안을 만들지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
