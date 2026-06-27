import { lookup } from "node:dns/promises";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ContentEntry, ContentType } from "@/lib/content";

const contentTypeSchema = z.enum(["press", "topic", "daily-review", "study-log", "camp-session", "wall-climb", "teach"]);

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
  pinned: z.boolean().nullable().optional(),
}).readonly();

const contentRowsSchema = z.array(contentRowSchema).readonly();
const remoteRequestTimeoutMs = 1800;
const remoteCheckIntervalMs = 60_000;
const internalPinnedTag = "__camp_pinned";

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
  readonly pinned?: boolean;
  readonly replyTo?: {
    readonly type: ContentType;
    readonly slug: string;
  };
};

export class RemoteContentConflictError extends Error {
  constructor() {
    super("Content slug already exists.");
    this.name = "RemoteContentConflictError";
  }
}

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

function remoteTypeFor(type: ContentType) {
  return type === "camp-session" || type === "wall-climb" ? "study-log" : type;
}

function remoteCategoryFor(input: RemoteContentInput) {
  if (input.type === "camp-session" || input.type === "wall-climb") return input.type;
  return input.category;
}

function remoteReplyToFor(replyTo?: RemoteContentInput["replyTo"]) {
  if (!replyTo) return { parent_type: undefined, parent_slug: undefined };
  if (replyTo.type === "camp-session" || replyTo.type === "wall-climb") {
    return { parent_type: "study-log" as const, parent_slug: `${replyTo.type}/${replyTo.slug}` };
  }
  return { parent_type: replyTo.type, parent_slug: replyTo.slug };
}

function localReplyToFor(row: Pick<z.infer<typeof contentRowSchema>, "parent_type" | "parent_slug">) {
  if (!row.parent_type || !row.parent_slug) return undefined;
  if (row.parent_type === "study-log" && row.parent_slug.startsWith("camp-session/")) {
    return { type: "camp-session" as const, slug: row.parent_slug.replace(/^camp-session\//, "") };
  }
  if (row.parent_type === "study-log" && row.parent_slug.startsWith("wall-climb/")) {
    return { type: "wall-climb" as const, slug: row.parent_slug.replace(/^wall-climb\//, "") };
  }
  return { type: row.parent_type, slug: row.parent_slug };
}

function shortDate(value?: string | null) {
  return value ? value.slice(0, 10) : undefined;
}

function baseHrefForType(type: ContentType) {
  if (type === "press") return "/press";
  if (type === "topic") return "/topics";
  if (type === "camp-session") return "/camp-session";
  if (type === "wall-climb") return "/wall-climb";
  return `/${type}`;
}

function decodeAttribute(value: string) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function attributeFromHtml(html: string, name: string) {
  const pattern = new RegExp(`${name}=["']([^"']+)["']`, "i");
  const value = pattern.exec(html)?.[1];
  return value ? decodeAttribute(value) : undefined;
}

function textFromHtml(html: string, marker: string) {
  const pattern = new RegExp(`<[^>]+${marker}[^>]*>([\\s\\S]*?)<\\/[^>]+>`, "i");
  const value = pattern.exec(html)?.[1];
  return value
    ? decodeAttribute(value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
    : undefined;
}

function wallMetadataFromHtml(html: string) {
  const sourceKind = attributeFromHtml(html, "data-source-kind");
  return {
    note: textFromHtml(html, "data-wall-note"),
    sourceImage: attributeFromHtml(html, "data-source-image"),
    sourceKind: sourceKind === "github" || sourceKind === "youtube" || sourceKind === "x" || sourceKind === "web" ? sourceKind : undefined,
    sourceTitle: attributeFromHtml(html, "data-source-title"),
    sourceUrl: attributeFromHtml(html, "data-source-url"),
    summary: textFromHtml(html, "data-wall-summary"),
  };
}

function publicTags(tags: readonly string[]) {
  return tags.filter((tag) => tag !== internalPinnedTag);
}

function hasMissingPinnedColumnError(error: { readonly message?: string; readonly details?: string | null; readonly hint?: string | null }) {
  const text = `${error.message ?? ""} ${error.details ?? ""} ${error.hint ?? ""}`.toLowerCase();
  return text.includes("pinned") && (text.includes("column") || text.includes("schema cache"));
}

function rowToEntry(row: z.infer<typeof contentRowSchema>): ContentEntry {
  const contentFormat = row.content_format ?? "markdown";
  const createdAt = shortDate(row.created_at) ?? new Date().toISOString().slice(0, 10);
  const publishedAt = shortDate(row.published_at) ?? createdAt;
  const type = row.type === "study-log" && row.category === "camp-session"
    ? "camp-session"
    : row.type === "study-log" && row.category === "wall-climb"
      ? "wall-climb"
      : row.type;
  const content = row.content?.trim() ?? "";
  const wallMetadata = type === "wall-climb" ? wallMetadataFromHtml(content) : {};
  const tags = row.tags ?? [];

  return {
    title: row.title,
    slug: row.slug,
    type,
    contentFormat,
    status: row.status as ContentEntry["status"],
    visibility: row.visibility as ContentEntry["visibility"],
    author: row.author ?? "익명",
    memberSlug: row.member_slug ?? undefined,
    category: row.category ?? undefined,
    tags: publicTags(tags),
    createdAt,
    updatedAt: shortDate(row.updated_at),
    publishedAt,
    content,
    excerpt: row.excerpt ?? "",
    pinned: row.pinned ?? tags.includes(internalPinnedTag),
    ...wallMetadata,
    replyTo: localReplyToFor(row),
    href: `${baseHrefForType(type)}/${row.slug}`.replace(/\/index$/, ""),
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
  const remoteType = remoteTypeFor(type);
  let query = supabase
    .from("content_index")
    .select("slug, type, title, status, visibility, author, member_slug, category, tags, published_at, created_at, updated_at, content_format, content, excerpt, parent_type, parent_slug, pinned")
    .eq("type", remoteType)
    .order("pinned", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (type === "camp-session") {
    query = query.eq("category", "camp-session");
  } else if (type === "wall-climb") {
    query = query.eq("category", "wall-climb");
  } else if (type === "study-log") {
    query = query.or("category.is.null,and(category.neq.camp-session,category.neq.wall-climb)");
  }

  if (!includeUnpublished && !canReadPrivateRows) {
    query = query.eq("status", "published").eq("visibility", "public");
  }

  const { data, error } = await query;
  if (error) {
    const fallbackData = await getRemoteEntriesByTypeWithoutPinned(type, { includeUnpublished });
    if (fallbackData) return fallbackData;
    markRemoteContentUnavailable();
    return [];
  }

  return contentRowsSchema.parse(data ?? []).map(rowToEntry);
}

async function getRemoteEntriesByTypeWithoutPinned(type: ContentType, { includeUnpublished = false }: { includeUnpublished?: boolean } = {}) {
  const canReadPrivateRows = hasServiceRoleKey();
  const supabase = createReadClient();
  const remoteType = remoteTypeFor(type);
  let query = supabase
    .from("content_index")
    .select("slug, type, title, status, visibility, author, member_slug, category, tags, published_at, created_at, updated_at, content_format, content, excerpt, parent_type, parent_slug")
    .eq("type", remoteType)
    .order("published_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (type === "camp-session") {
    query = query.eq("category", "camp-session");
  } else if (type === "wall-climb") {
    query = query.eq("category", "wall-climb");
  } else if (type === "study-log") {
    query = query.or("category.is.null,and(category.neq.camp-session,category.neq.wall-climb)");
  }

  if (!includeUnpublished && !canReadPrivateRows) {
    query = query.eq("status", "published").eq("visibility", "public");
  }

  const { data, error } = await query;
  if (error) return undefined;

  return contentRowsSchema.parse(data ?? []).map(rowToEntry);
}

export async function remoteContentExists(type: ContentType, slug: string) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) return false;

  const supabase = hasServiceRoleKey() ? createAdminClient() : createAnonClient();
  const { data, error } = await supabase
    .from("content_index")
    .select("id")
    .eq("type", remoteTypeFor(type))
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
  const supabase = hasServiceRoleKey() ? createAdminClient() : createAnonClient();
  const replyTo = remoteReplyToFor(input.replyTo);
  const { error } = await supabase
    .from("content_index")
    .insert({
      slug: input.slug,
      type: remoteTypeFor(input.type),
      title: input.title,
      status: "published",
      visibility: "public",
      author: input.author,
      member_slug: input.memberSlug,
      category: remoteCategoryFor(input),
      tags: [...new Set(input.tags)],
      published_at: now,
      content_format: "html",
      content: input.html,
      excerpt: input.excerpt,
      parent_type: replyTo.parent_type,
      parent_slug: replyTo.parent_slug,
    });

  if (error?.code === "23505") throw new RemoteContentConflictError();
  if (error) throw error;
}

export async function updateRemoteContent(type: ContentType, slug: string, input: RemoteContentInput) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) {
    throw new Error("Remote content storage is not configured.");
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const replyTo = remoteReplyToFor(input.replyTo);

  if (type !== input.type || slug !== input.slug) {
    await deleteRemoteContent(type, slug);
  }

  const { error } = await admin
    .from("content_index")
    .upsert({
      slug: input.slug,
      type: remoteTypeFor(input.type),
      title: input.title,
      status: "published",
      visibility: "public",
      author: input.author,
      member_slug: input.memberSlug,
      category: remoteCategoryFor(input),
      tags: [...new Set(input.tags)],
      content_format: "html",
      content: input.html,
      excerpt: input.excerpt,
      parent_type: replyTo.parent_type,
      parent_slug: replyTo.parent_slug,
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
      type: remoteTypeFor(type),
      title: "Deleted",
      status: "archived",
      visibility: "public",
      author: "Admin",
      member_slug: "admin",
      category: type === "camp-session" || type === "wall-climb" ? type : "deleted",
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

export async function setRemoteContentPinned(type: ContentType, slug: string, pinned: boolean) {
  if (!(await canUseRemoteContent({ requireWrite: true }))) {
    throw new Error("Remote content storage is not configured.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("content_index")
    .update({
      pinned,
      updated_at: new Date().toISOString(),
    })
    .eq("type", remoteTypeFor(type))
    .eq("slug", slug);

  if (!error) return;
  if (!hasMissingPinnedColumnError(error)) throw error;

  const { data, error: readError } = await admin
    .from("content_index")
    .select("tags")
    .eq("type", remoteTypeFor(type))
    .eq("slug", slug)
    .maybeSingle();

  if (readError) throw readError;
  const existingTagsSchema = z.object({ tags: z.array(z.string()).nullable() }).nullable();
  const existingTags = existingTagsSchema.parse(data)?.tags ?? [];
  const nextTags = pinned
    ? [...new Set([...existingTags, internalPinnedTag])]
    : existingTags.filter((tag) => tag !== internalPinnedTag);

  const { error: tagError } = await admin
    .from("content_index")
    .update({
      tags: nextTags,
      updated_at: new Date().toISOString(),
    })
    .eq("type", remoteTypeFor(type))
    .eq("slug", slug);

  if (tagError) throw tagError;
}
