import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { buildContentMarkdown, buildContentPath, contentSubmissionSchema } from "@/lib/content-submission";

export const runtime = "nodejs";

type GitHubRequestOptions = {
  readonly method?: string;
  readonly body?: unknown;
};

const requestSchema = z.object({
  dryRun: z.boolean().default(false),
  submission: contentSubmissionSchema,
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return NextResponse.json(body, {
    ...init,
    headers: { ...corsHeaders, ...(init?.headers ?? {}) },
  });
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server env: ${name}`);
  return value;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "member";
}

function getBearerToken(request: NextRequest) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

async function getMemberContext(accessToken: string) {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const publishableKey = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const supabase = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) return null;

  const user = userData.user;
  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase.from("member_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("display_name, slug").eq("id", user.id).maybeSingle(),
  ]);

  const role = roleRow?.role ?? "pending";
  if (role !== "member" && role !== "admin") return null;

  const emailName = user.email?.split("@")[0] ?? user.id.slice(0, 8);
  const memberSlug = profile?.slug ?? slugify(emailName);
  const author = profile?.display_name ?? user.email ?? memberSlug;

  return { userId: user.id, email: user.email, role, memberSlug, author };
}

function encodePath(path: string) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function githubRequest<T>(path: string, options: GitHubRequestOptions = {}): Promise<T> {
  const token = requireEnv("GITHUB_CONTENT_TOKEN");
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub ${response.status} ${response.statusText}: ${text}`);
  }

  return (await response.json()) as T;
}

async function githubMaybeRequest<T>(path: string): Promise<T | null> {
  const token = requireEnv("GITHUB_CONTENT_TOKEN");
  const response = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub ${response.status} ${response.statusText}: ${text}`);
  }

  return (await response.json()) as T;
}

async function createContentPullRequest(params: {
  readonly path: string;
  readonly markdown: string;
  readonly slug: string;
  readonly title: string;
  readonly memberSlug: string;
}) {
  const repository = process.env.GITHUB_REPOSITORY_NAME ?? process.env.GITHUB_REPOSITORY ?? "passeth/camp";
  const baseBranch = process.env.GITHUB_BASE_BRANCH ?? "main";
  const branch = `content/${params.memberSlug}/${Date.now()}-${params.slug}`;
  const encodedPath = encodePath(params.path);

  type RefResponse = { readonly object: { readonly sha: string } };
  type PullResponse = { readonly number: number; readonly html_url: string };

  const existingFile = await githubMaybeRequest<unknown>(`/repos/${repository}/contents/${encodedPath}?ref=${encodeURIComponent(baseBranch)}`);
  if (existingFile) {
    return { conflict: true as const, path: params.path };
  }

  const baseRef = await githubRequest<RefResponse>(`/repos/${repository}/git/ref/heads/${encodeURIComponent(baseBranch)}`);

  await githubRequest(`/repos/${repository}/git/refs`, {
    method: "POST",
    body: {
      ref: `refs/heads/${branch}`,
      sha: baseRef.object.sha,
    },
  });

  await githubRequest(`/repos/${repository}/contents/${encodedPath}`, {
    method: "PUT",
    body: {
      message: `Submit content: ${params.title}`,
      content: Buffer.from(params.markdown, "utf8").toString("base64"),
      branch,
    },
  });

  const pull = await githubRequest<PullResponse>(`/repos/${repository}/pulls`, {
    method: "POST",
    body: {
      title: `Content: ${params.title}`,
      head: branch,
      base: baseBranch,
      body: [
        "Submitted from Camp Obsidian plugin.",
        "",
        `- Author slug: ${params.memberSlug}`,
        `- Content path: ${params.path}`,
        "- Automation: content validation and auto-merge workflow",
      ].join("\n"),
      maintainer_can_modify: true,
    },
  });

  return {
    conflict: false as const,
    branch,
    path: params.path,
    pullRequest: {
      number: pull.number,
      url: pull.html_url,
    },
  };
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  return jsonResponse({
    ok: true,
    contract: "camp.contentSubmission.v1",
    requiredAuth: "Authorization: Bearer <Supabase access token>",
  });
}

export async function POST(request: NextRequest) {
  try {
    const accessToken = getBearerToken(request);
    if (!accessToken) return jsonResponse({ error: "Missing bearer token" }, { status: 401 });

    const member = await getMemberContext(accessToken);
    if (!member) return jsonResponse({ error: "Member approval required" }, { status: 403 });

    const parsed = requestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonResponse({ error: "Invalid submission", issues: parsed.error.issues }, { status: 400 });
    }

    const markdown = buildContentMarkdown(parsed.data.submission, member.author, member.memberSlug);
    const path = buildContentPath(parsed.data.submission.type, parsed.data.submission.slug);

    if (parsed.data.dryRun) {
      return jsonResponse({ ok: true, dryRun: true, path, markdown });
    }

    const result = await createContentPullRequest({
      path,
      markdown,
      slug: parsed.data.submission.slug,
      title: parsed.data.submission.title,
      memberSlug: member.memberSlug,
    });

    if (result.conflict) {
      return jsonResponse({ error: "Content path already exists", path: result.path }, { status: 409 });
    }

    return jsonResponse({ ok: true, ...result }, { status: 201 });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
