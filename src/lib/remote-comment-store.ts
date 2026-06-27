import { lookup } from "node:dns/promises";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createPasswordHash, verifyPassword } from "@/lib/comment-password";
import { contentTypes } from "@/lib/content";
const commentRowSchema = z.object({
  id: z.string(),
  author_name: z.string().nullable(),
  body: z.string(),
  created_at: z.string(),
  password_hash: z.string().nullable().optional(),
}).readonly();
const commentRowsSchema = z.array(commentRowSchema).readonly();
const legacyCommentRowSchema = z.object({
  id: z.string(),
  body: z.string(),
  created_at: z.string(),
}).readonly();
const deleteCommentRowSchema = z.object({
  id: z.string(),
  body: z.string(),
  password_hash: z.string().nullable().optional(),
}).readonly();
const legacyCommentRowsSchema = z.array(legacyCommentRowSchema).readonly();
const supabaseRequestTimeoutMs = 1500;
const remoteCheckIntervalMs = 60_000;
let remoteCommentsAvailable: boolean | null = null;
let remoteCommentsCheckedAt = 0;
export type RemoteCommentInput = {
  readonly contentType: (typeof contentTypes)[number];
  readonly contentSlug: string;
  readonly authorName: string;
  readonly body: string;
  readonly password: string;
};
type RemoteCommentDeleteInput = Pick<RemoteCommentInput, "contentType" | "contentSlug" | "password"> & {
  readonly commentId: string;
};
function requireServerEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing server env: ${name}`);
  return value;
}
const timeoutFetch: typeof fetch = (input, init) => fetch(input, {
  ...init,
  signal: init?.signal ?? AbortSignal.timeout(supabaseRequestTimeoutMs),
});
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
function remoteCommentType(type: RemoteCommentInput["contentType"]) {
  return type === "camp-session" ? "study-log" : type;
}
function remoteCommentSlug(input: Pick<RemoteCommentInput, "contentType" | "contentSlug">) {
  return input.contentType === "camp-session" ? `camp-session/${input.contentSlug}` : input.contentSlug;
}
export async function canUseRemoteComments() {
  const now = Date.now();
  if (remoteCommentsAvailable !== null && now - remoteCommentsCheckedAt < remoteCheckIntervalMs) {
    return remoteCommentsAvailable;
  }
  remoteCommentsCheckedAt = now;
  try {
    const hostname = new URL(requireServerEnv("NEXT_PUBLIC_SUPABASE_URL")).hostname;
    await Promise.race([
      lookup(hostname),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Supabase DNS lookup timed out.")), 500);
      }),
    ]);
    remoteCommentsAvailable = true;
  } catch {
    remoteCommentsAvailable = false;
  }
  return remoteCommentsAvailable;
}
export function markRemoteCommentsUnavailable() {
  remoteCommentsAvailable = false;
  remoteCommentsCheckedAt = Date.now();
}
function commentPayload(row: z.infer<typeof commentRowSchema>) {
  return {
    id: row.id,
    authorName: row.author_name ?? "익명",
    body: row.body,
    createdAt: row.created_at,
  };
}
function encodeLegacyBody(authorName: string, body: string, passwordHash: string) {
  const metadata = Buffer.from(JSON.stringify({ authorName, passwordHash }), "utf8").toString("base64");
  return `@@camp-comment:${metadata}\n${body}`;
}
function decodeLegacyBody(value: string) {
  const metadataMatch = /^@@camp-comment:([A-Za-z0-9+/=]+)\n([\s\S]*)$/.exec(value);
  if (metadataMatch) {
    const metadataSchema = z.object({
      authorName: z.string(),
      passwordHash: z.string().optional(),
    });
    const metadata = metadataSchema.safeParse(JSON.parse(Buffer.from(metadataMatch[1], "base64").toString("utf8")));
    if (metadata.success) return { ...metadata.data, body: metadataMatch[2] };
  }
  const match = /^@@camp-author:([A-Za-z0-9+/=]+)\n([\s\S]*)$/.exec(value);
  if (!match) return { authorName: "익명", body: value, passwordHash: undefined };
  return {
    authorName: Buffer.from(match[1], "base64").toString("utf8"),
    body: match[2],
    passwordHash: undefined,
  };
}
function legacyCommentPayload(row: z.infer<typeof legacyCommentRowSchema>) {
  const decoded = decodeLegacyBody(row.body);
  return {
    id: row.id,
    authorName: decoded.authorName,
    body: decoded.body,
    createdAt: row.created_at,
  };
}
async function getCommentUserId() {
  const adminEmail = requireServerEnv("ADMIN_EMAIL").toLowerCase();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === adminEmail);
  if (!user) throw new Error("Missing admin user for legacy comments.");
  return user.id;
}
async function getLegacyComments(contentType: string, contentSlug: string) {
  const supabase = createAnonClient();
  const { data, error } = await supabase
    .from("comments")
    .select("id, body, created_at")
    .eq("content_type", contentType)
    .eq("content_slug", contentSlug)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return legacyCommentRowsSchema.parse(data ?? []).map(legacyCommentPayload);
}
async function createLegacyComment(input: RemoteCommentInput) {
  const admin = createAdminClient();
  const userId = await getCommentUserId();
  const passwordHash = await createPasswordHash(input.password);
  const { data, error } = await admin
    .from("comments")
    .insert({
      user_id: userId,
      content_type: input.contentType,
      content_slug: input.contentSlug,
      body: encodeLegacyBody(input.authorName, input.body, passwordHash),
    })
    .select("id, body, created_at")
    .single();
  if (error) throw error;
  return legacyCommentPayload(legacyCommentRowSchema.parse(data));
}
export async function getRemoteComments(input: Pick<RemoteCommentInput, "contentType" | "contentSlug">) {
  const supabase = createAnonClient();
  const contentType = remoteCommentType(input.contentType);
  const contentSlug = remoteCommentSlug(input);
  const { data, error } = await supabase
    .from("comments")
    .select("id, author_name, body, created_at")
    .eq("content_type", contentType)
    .eq("content_slug", contentSlug)
    .order("created_at", { ascending: true });
  if (!error) return commentRowsSchema.parse(data ?? []).map(commentPayload);
  return getLegacyComments(contentType, contentSlug);
}
export async function createRemoteComment(input: RemoteCommentInput) {
  const supabase = createAnonClient();
  const contentType = remoteCommentType(input.contentType);
  const contentSlug = remoteCommentSlug(input);
  const { data, error } = await supabase
    .from("comments")
    .insert({
      user_id: null,
      content_type: contentType,
      content_slug: contentSlug,
      author_name: input.authorName,
      body: input.body,
      password_hash: await createPasswordHash(input.password),
    })
    .select("id, author_name, body, created_at")
    .single();
  if (!error) return commentPayload(commentRowSchema.parse(data));
  return createLegacyComment({ ...input, contentType, contentSlug });
}
export async function deleteRemoteComment(input: RemoteCommentDeleteInput) {
  const admin = createAdminClient();
  const contentType = remoteCommentType(input.contentType);
  const contentSlug = remoteCommentSlug(input);
  const { data, error } = await admin
    .from("comments")
    .select("id, body, password_hash")
    .eq("id", input.commentId)
    .eq("content_type", contentType)
    .eq("content_slug", contentSlug)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { deleted: false as const };
  const row = deleteCommentRowSchema.parse(data);
  const legacy = decodeLegacyBody(row.body);
  const passwordHash = row.password_hash ?? legacy.passwordHash;
  const passwordMatches = passwordHash ? await verifyPassword(input.password, passwordHash) : true;
  if (!passwordMatches) return { deleted: false as const };
  const { error: deleteError } = await admin.from("comments").delete().eq("id", row.id);
  if (deleteError) throw deleteError;
  return { deleted: true as const };
}
