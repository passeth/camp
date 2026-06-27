import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { z } from "zod";
import { createPasswordHash, verifyPassword } from "@/lib/comment-password";
import { contentTypes } from "@/lib/content";

const localCommentSchema = z.object({
  id: z.string(),
  contentType: z.enum(contentTypes),
  contentSlug: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
  passwordHash: z.string().optional(),
}).readonly();

const localCommentsSchema = z.array(localCommentSchema).readonly();

type LocalComment = z.infer<typeof localCommentSchema>;

type LocalCommentInput = {
  readonly contentType: LocalComment["contentType"];
  readonly contentSlug: string;
  readonly authorName: string;
  readonly body: string;
  readonly password: string;
};

type LocalCommentPayload = Omit<LocalComment, "passwordHash">;

function toPayload(comment: LocalComment): LocalCommentPayload {
  return {
    id: comment.id,
    contentType: comment.contentType,
    contentSlug: comment.contentSlug,
    authorName: comment.authorName,
    body: comment.body,
    createdAt: comment.createdAt,
  };
}

function storePath() {
  if (process.env.VERCEL) return path.join(tmpdir(), "camp-comments.json");
  return path.join(process.cwd(), "data", "comments.json");
}

async function readComments() {
  try {
    const raw = await readFile(storePath(), "utf8");
    return localCommentsSchema.parse(JSON.parse(raw));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

async function writeComments(comments: readonly LocalComment[]) {
  const filePath = storePath();
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.${randomUUID()}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(comments, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

export async function getLocalComments(input: Pick<LocalCommentInput, "contentType" | "contentSlug">) {
  const comments = await readComments();
  return comments
    .filter((comment) => comment.contentType === input.contentType && comment.contentSlug === input.contentSlug)
    .map(toPayload);
}

export async function createLocalComment(input: LocalCommentInput) {
  const comments = await readComments();
  const comment = {
    id: randomUUID(),
    contentType: input.contentType,
    contentSlug: input.contentSlug,
    authorName: input.authorName,
    body: input.body,
    createdAt: new Date().toISOString(),
    passwordHash: await createPasswordHash(input.password),
  } satisfies LocalComment;

  await writeComments([...comments, comment]);
  return toPayload(comment);
}

export async function deleteLocalComment(input: Pick<LocalCommentInput, "contentType" | "contentSlug" | "password"> & { readonly commentId: string }) {
  const comments = await readComments();
  const index = comments.findIndex((comment) => (
    comment.id === input.commentId
    && comment.contentType === input.contentType
    && comment.contentSlug === input.contentSlug
  ));

  if (index === -1) return { deleted: false, reason: "not-found" as const };

  const comment = comments[index];
  const passwordMatches = comment.passwordHash ? await verifyPassword(input.password, comment.passwordHash) : true;
  if (!passwordMatches) return { deleted: false, reason: "password" as const };

  await writeComments(comments.filter((candidate) => candidate.id !== input.commentId));
  return { deleted: true as const };
}
