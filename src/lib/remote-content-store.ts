import { lookup } from "node:dns/promises";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ContentEntry, ContentType } from "@/lib/content";

const contentTypeSchema = z.enum(["press", "topic", "daily-review", "study-log", "teach"]);

const contentRowSchema = z.object({
  slug: z.string(),
  type: contentTypeSchema,
  title: z.string(),
  status: z.string(),
  visibility: z.string(),
  author: z.string().nullable(),
  member_slug: z.string().nullable(),
  category: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  published_at: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  content_format: z.enum(["markdown", "html"]).nullable(),
  content: z.string().nullable(),
  excerpt: z.string().nullable(),
  parent_type: contentTypeSchema.nullable().optional(),
  parent_slug: z.string().nullable().optional(),
}).readonly();

const contentRowsSchema = z.array(contentRowSchema).readonly();
const remoteRequestTimeoutMs = 1800;
const remoteCheckIntervalMs = 60_000;

let remoteContentAvailable: boolean | null = null;
let remoteContentCheckedAt = 0;

export type RemoteContentInput = {
  readonly slug: string;
  readonly type: ContentType;
  readonly title: string;
  readonly author: string;
  readonly memberSlug: string;
  readonly category?: string;
  readonly tags: readonly string[];
  readonly excerpt: string;
  readonly html: string;
  readonly replyTo?: {
    readonly type: ContentType;
    readonly slug: string;
  };
};

function serverEnv(name: string) {
  return process.env[name];
}

function requireServerEnv(name: string) {
  const value = serverEnv(name);
  if (!value) throw new Error(`Missing server env: ${name}`);
  return value;
}

const timeoutFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: init?.signal ?? AbortSignal.timeout(remoteRequestTimeoutMs),
});

function hasRemoteContentEnv({ requireWrite = false }: { requireWrite?: boolean } = {}) {
  void requireWrite;
  return Boolean(
    serverEnv("NEXT_PUBLIC_SUPABASE_URL")
    && serverEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
  );
}

function createAnonClient() {
  return createSupabaseClient(
    requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timeoutFetch },
    },
  );
}

function hasServiceRoleKey() {
  return Boolean(serverEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

function createAdminClient() {
  return createSupabaseClient(
    requireServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { fetch: timeoutFetch },
    },
  );
}

function createReadClient() {
  return hasServiceRoleKey() ? createAdminClient() : createAnonClient();
}

function shortDate(value?: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

function baseHrefForType(type: ContentType) {
  if (type === "press") return "/press";
  if (type === "topic") return "/topics";
  return `/${type}`;
}

function rowToEntry(row: z.infer<typeof contentRowSchema>): ContentEntry {
  const contentFormat = row.content_format ?? "markdown";
  const createdAt = shortDate(row.created_at) ?? new Date().toISOString().slice(0, 10);
  const publishedAt = shortDate(row.published_at) ?? createdAt;

  return {
    title: row.title,
    slug: row.slug,
    type: row.type,
    contentFormat,
    status: row.status as ContentEntry["status"],
    visibility: row.visibility as ContentEntry["visibility"],
    author: row.author ?? "익명",
    memberSlug: row.member_slug ?? undefined,
    category: row.category ?? undefined,
    tags: row.tags ?? [],
    createdAt,
    updatedAt: shortDate(row.updated_at),
    publishedAt,
    content: row.content?.trim() ?? "",
    excerpt: row.excerpt ?? "",
    replyTo: row.parent_type && row.parent_slug ? { type: row.parent_type, slug: row.parent_slug } : undefined,
    href: `${baseHrefForType(row.type)}/${row.slug}`.replace(/\/index$/, ""),
    pathSegments: row.slug.split("/").filter(Boolean),
  };
}

export async function canUseRemoteContent({ requireWrite = false }: { requireWrite?: boolean } = {}) {
  if (!hasRemoteContentEnv({ requireWrite })) return false;
  if (process.env.VERCEL) return true;

  const now = Date.now();
  if (remoteContentAvailable !== null && now - remoteContentCheckedAt < remoteCheckIntervalMs) {
    return remoteContentAvailable;
  }

  remoteContentCheckedAt = now;
  try {
    const hostname = new URL(requireServerEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname;
    await Promise.race([
      lookup(hostname),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Supabase DNS lookup timed out.")), 500);
      }),
    ]);
    remoteContentAvailable = true;
  } catch {
    remoteContentAvailable = false;
  }

  return remoteContentAvailable;
}

export function markRemoteContentUnavailable() {
  remoteContentAvailable = false;
  remoteContentCheckedAt = Date.now();
}

export async function getRemoteEntriesByType(type: ContentType, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  if (!(await canUseRemoteContent())) return [];

  const canReadPrivateRows = hasServiceRoleKey();
  const supabase = createReadClient();
  let query = supabase
    .from("content_index")
    .select("slug, type, title, status, visibility, author, member_slug, category, tags, published_at, created_at, updated_at, content_format, content, excerpt, parent_type, parent_slug")
    .eq("type", type)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (!includeUnpublished && !canReadPrivateRows) {
    query = query.eq("status", "published").eq("visibility", "public");
  }

  const { data, error } = await query;
  if (error) {
    markRemoteContentUnavailable();
    return [];
  }

  return contentRowsSchema.parse(data ?? []).map(rowToEntry);
}

export async function remoteContentExists(type: ContentType, slug: string) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) return false;

  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("content_index")
    .select("id")
    .eq("type", type)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

export async function createRemoteContent(input: RemoteContentInput) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) {
    throw new Error("Remote content storage is not configured.");
  }

  const now = new Date().toISOString();
  const supabase = createAnonClient();
  const { error } = await supabase
    .from("content_index")
    .insert({
      slug: input.slug,
      type: input.type,
      title: input.title,
      status: "published",
      visibility: "public",
      author: input.author,
      member_slug: input.memberSlug,
      category: input.category,
      tags: [...new Set(input.tags)],
      published_at: now,
      content_format: "html",
      content: input.html,
      excerpt: input.excerpt,
      parent_type: input.replyTo?.type,
      parent_slug: input.replyTo?.slug,
    });

  if (error) throw error;
}

export async function updateRemoteContent(type: ContentType, slug: string, input: RemoteContentInput) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) {
    throw new Error("Remote content storage is not configured.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  if (type !== input.type || slug !== input.slug) {
    await deleteRemoteContent(type, slug);
  }

  const { error } = await admin
    .from("content_index")
    .upsert({
      slug: input.slug,
      type: input.type,
      title: input.title,
      status: "published",
      visibility: "public",
      author: input.author,
      member_slug: input.memberSlug,
      category: input.category,
      tags: [...new Set(input.tags)],
      content_format: "html",
      content: input.html,
      excerpt: input.excerpt,
      parent_type: input.replyTo?.type,
      parent_slug: input.replyTo?.slug,
      published_at: now,
      updated_at: now,
    }, { onConflict: "type,slug" });

  if (error) throw error;
}

export async function deleteRemoteContent(type: ContentType, slug: string) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) {
    throw new Error("Remote content storage is not configured.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin
    .from("content_index")
    .upsert({
      slug,
      type,
      title: "Deleted",
      status: "archived",
      visibility: "public",
      author: "Admin",
      member_slug: "admin",
      category: "deleted",
      tags: [],
      published_at: now,
      content_format: "html",
      content: "<p>Deleted</p>",
      excerpt: "Deleted",
      parent_type: null,
      parent_slug: null,
      updated_at: now,
    }, { onConflict: "type,slug" });

  if (error) throw error;
}
