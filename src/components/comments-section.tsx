"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { CommentRow } from "@/components/comment-row";
import { ReplyPostList, type ReplyPostSummary } from "@/components/reply-post-list";
import type { ContentType } from "@/lib/content";
const apiCommentSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  body: z.string(),
  createdAt: z.string(),
}).readonly();
const commentsResponseSchema = z.object({
  comments: z.array(apiCommentSchema).readonly(),
}).readonly();
const createCommentResponseSchema = z.object({
  comment: apiCommentSchema,
}).readonly();
type ApiComment = z.infer<typeof apiCommentSchema>;
type Notice =
  | { readonly kind: "idle"; readonly message: string }
  | { readonly kind: "loading"; readonly message: string }
  | { readonly kind: "success"; readonly message: string }
  | { readonly kind: "error"; readonly message: string };
type CommentsSectionProps = {
  readonly contentType: ContentType;
  readonly contentSlug: string;
  readonly replyPostHref: string;
  readonly replyPosts: readonly ReplyPostSummary[];
};
class CommentRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommentRequestError";
  }
}
export function CommentsSection({ contentType, contentSlug, replyPostHref, replyPosts }: CommentsSectionProps) {
  const [comments, setComments] = useState<readonly ApiComment[]>([]);
  const [authorName, setAuthorName] = useState("");
  const [body, setBody] = useState("");
  const [password, setPassword] = useState("");
  const [deletePasswords, setDeletePasswords] = useState<Readonly<Record<string, string>>>({});
  const [notice, setNotice] = useState<Notice>({ kind: "loading", message: "댓글을 불러오는 중입니다." });
  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({ contentType, contentSlug });
    async function loadComments() {
      try {
        const response = await fetch(`/api/comments?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new CommentRequestError("댓글을 불러오지 못했습니다.");
        const parsed = commentsResponseSchema.safeParse(await response.json());
        if (!parsed.success) throw new CommentRequestError("댓글 응답을 읽지 못했습니다.");
        setComments(parsed.data.comments);
        setNotice({ kind: "idle", message: "" });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setNotice({
          kind: "error",
          message: error instanceof Error ? error.message : "댓글을 불러오지 못했습니다.",
        });
      }
    }
    void loadComments();
    return () => controller.abort();
  }, [contentSlug, contentType]);
  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedAuthorName = authorName.trim();
    const trimmedBody = body.trim();
    const trimmedPassword = password.trim();
    if (!trimmedAuthorName || !trimmedBody || trimmedPassword.length < 4) {
      setNotice({ kind: "error", message: "이름, 댓글, 4자 이상 비밀번호를 입력해 주세요." });
      return;
    }
    setNotice({ kind: "loading", message: "댓글을 저장하는 중입니다." });
    try {
      const response = await fetch("/api/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentSlug,
          authorName: trimmedAuthorName,
          body: trimmedBody,
          password: trimmedPassword,
        }),
      });
      if (!response.ok) throw new CommentRequestError("댓글을 저장하지 못했습니다.");
      const parsed = createCommentResponseSchema.safeParse(await response.json());
      if (!parsed.success) throw new CommentRequestError("저장된 댓글을 읽지 못했습니다.");
      setComments((current) => [...current, parsed.data.comment]);
      setBody("");
      setPassword("");
      setNotice({ kind: "success", message: "댓글이 등록되었습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "댓글을 저장하지 못했습니다.",
      });
    }
  }
  async function deleteComment(commentId: string) {
    setNotice({ kind: "loading", message: "댓글을 삭제하는 중입니다." });
    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType,
          contentSlug,
          commentId,
          password: deletePasswords[commentId] ?? "",
        }),
      });
      if (!response.ok) throw new CommentRequestError("비밀번호가 맞지 않거나 댓글을 찾을 수 없습니다.");
      setComments((current) => current.filter((comment) => comment.id !== commentId));
      setDeletePasswords((current) => {
        const next = { ...current };
        delete next[commentId];
        return next;
      });
      setNotice({ kind: "success", message: "댓글이 삭제되었습니다." });
    } catch (error) {
      setNotice({
        kind: "error",
        message: error instanceof Error ? error.message : "댓글을 삭제하지 못했습니다.",
      });
    }
  }
  function updateDeletePassword(commentId: string, nextPassword: string) {
    setDeletePasswords((current) => ({ ...current, [commentId]: nextPassword }));
  }
  return (
    <section id="comments" className="mt-12 scroll-mt-28 border-t border-[var(--line)] pt-8" aria-labelledby="comments-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--muted)]">Comments</p>
          <h2 id="comments-title" className="mt-2 text-2xl font-medium tracking-[-0.03em] text-[var(--foreground)]">
            답글
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-sm font-semibold text-[var(--muted)]">{comments.length + replyPosts.length}개</p>
          <Link href={replyPostHref} className="rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-semibold !text-white transition hover:opacity-80">
            게시글로 답하기
          </Link>
        </div>
      </div>
      <form onSubmit={submitComment} className="mt-6 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="comment-body">
            이 게시글에 답글 달기
          </label>
          <p className={`text-sm ${notice.kind === "error" ? "text-[var(--status-warning-text)]" : "text-[var(--muted)]"}`}>
            {notice.message}
          </p>
        </div>
        <textarea
          id="comment-body"
          value={body}
          onChange={(event) => setBody(event.currentTarget.value)}
          maxLength={2000}
          rows={1}
          style={{ height: "2.75rem", minHeight: "2.75rem" }}
          className="w-full resize-none rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--brand)]"
          placeholder="질문, 보충 자료, 다음 모임에서 다룰 내용을 남겨주세요."
        />
        <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
          <label className="sr-only" htmlFor="comment-author">
            이름
          </label>
          <input
            id="comment-author"
            value={authorName}
            onChange={(event) => setAuthorName(event.currentTarget.value)}
            maxLength={80}
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)]"
            placeholder="이름 또는 닉네임"
          />
          <label className="sr-only" htmlFor="comment-password">
            삭제 비밀번호
          </label>
          <input
            id="comment-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.currentTarget.value)}
            minLength={4}
            maxLength={80}
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)]"
            placeholder="삭제 비밀번호"
          />
          <button
            type="submit"
            disabled={notice.kind === "loading"}
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            답글 등록
          </button>
        </div>
      </form>
      <div className="mt-6 space-y-3">
        <ReplyPostList posts={replyPosts} />
        {comments.length === 0 && replyPosts.length === 0 && notice.kind !== "loading" ? (
          <p className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface-soft)] px-4 py-5 text-sm text-[var(--muted)]">아직 답글이 없습니다. 첫 질문이나 보충 자료를 남겨보세요.</p>
        ) : null}
        {comments.map((comment) => (
          <CommentRow
            key={comment.id}
            comment={comment}
            deletePassword={deletePasswords[comment.id] ?? ""}
            disabled={notice.kind === "loading"}
            onDelete={(commentId) => {
              void deleteComment(commentId);
            }}
            onDeletePasswordChange={updateDeletePassword}
          />
        ))}
      </div>
    </section>
  );
}
