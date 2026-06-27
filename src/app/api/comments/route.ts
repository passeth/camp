import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { contentTypes } from "@/lib/content";
import { createLocalComment, deleteLocalComment, getLocalComments } from "@/lib/local-comment-store";
import {
  canUseRemoteComments,
  createRemoteComment,
  deleteRemoteComment,
  getRemoteComments,
  markRemoteCommentsUnavailable,
} from "@/lib/remote-comment-store";

export const runtime = "nodejs";

const commentQuerySchema = z.object({
  contentType: z.enum(contentTypes),
  contentSlug: z.string().trim().min(1).max(160),
});

const commentInputSchema = commentQuerySchema.extend({
  authorName: z.string().trim().min(1).max(80),
  body: z.string().trim().min(1).max(2000),
  password: z.string().trim().min(4).max(80),
}).readonly();

const commentDeleteSchema = commentQuerySchema.extend({
  commentId: z.string().trim().min(1),
  password: z.string().trim().max(80),
}).readonly();

const readonlyCommentQuerySchema = commentQuerySchema.readonly();

export async function GET(request: NextRequest) {
  const parsed = readonlyCommentQuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams));
  if (!parsed.success) {
    return NextResponse.json({ error: "댓글 요청 값이 올바르지 않습니다." }, { status: 400 });
  }

  if (await canUseRemoteComments()) {
    try {
      const comments = await getRemoteComments(parsed.data);
      return NextResponse.json({ comments });
    } catch {
      markRemoteCommentsUnavailable();
    }
  }

  const comments = await getLocalComments(parsed.data);
  return NextResponse.json({ comments });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "댓글 요청 JSON이 올바르지 않습니다." }, { status: 400 });
    }
    throw error;
  }

  const parsed = commentInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "이름과 댓글 내용을 확인해 주세요." }, { status: 400 });
  }

  if (await canUseRemoteComments()) {
    try {
      const comment = await createRemoteComment(parsed.data);
      return NextResponse.json({ comment }, { status: 201 });
    } catch {
      markRemoteCommentsUnavailable();
    }
  }

  const comment = await createLocalComment(parsed.data);
  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "댓글 삭제 요청 JSON이 올바르지 않습니다." }, { status: 400 });
    }
    throw error;
  }

  const parsed = commentDeleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "삭제할 댓글과 비밀번호를 확인해 주세요." }, { status: 400 });
  }

  if (await canUseRemoteComments()) {
    try {
      const result = await deleteRemoteComment(parsed.data);
      if (result.deleted) return NextResponse.json({ deleted: true });
      return NextResponse.json({ error: "비밀번호가 맞지 않거나 댓글을 찾을 수 없습니다." }, { status: 403 });
    } catch (error) {
      console.error(error);
      markRemoteCommentsUnavailable();
      if (process.env.VERCEL) {
        return NextResponse.json({ error: "댓글 삭제 설정을 확인해야 합니다." }, { status: 500 });
      }
    }
  }

  const result = await deleteLocalComment(parsed.data);
  if (result.deleted) return NextResponse.json({ deleted: true });

  return NextResponse.json({ error: "비밀번호가 맞지 않거나 댓글을 찾을 수 없습니다." }, { status: 403 });
}
