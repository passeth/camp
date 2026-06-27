"use client";
import type { FormEvent } from "react";
import { CommentBody } from "@/components/comment-body";

type CommentRowProps = {
  readonly comment: {
    readonly authorName: string;
    readonly body: string;
    readonly createdAt: string;
    readonly id: string;
  };
  readonly deletePassword: string;
  readonly disabled: boolean;
  readonly onDelete: (commentId: string) => void;
  readonly onDeletePasswordChange: (commentId: string, password: string) => void;
};

function formatCommentDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function CommentRow({ comment, deletePassword, disabled, onDelete, onDeletePasswordChange }: CommentRowProps) {
  function submitDelete(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onDelete(comment.id);
  }

  return (
    <article className="grid grid-cols-[24px_minmax(0,1fr)] gap-3 rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col items-center" aria-hidden="true">
        <span className="h-2 w-2 rounded-full bg-[var(--foreground)]" />
        <span className="mt-2 min-h-16 w-px flex-1 bg-[var(--line)]" />
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h3 className="text-sm font-semibold text-[var(--foreground)]">{comment.authorName}</h3>
          <time className="text-xs text-[var(--muted)]" dateTime={comment.createdAt}>
            {formatCommentDate(comment.createdAt)}
          </time>
        </div>
        <CommentBody body={comment.body} />
        <form className="mt-4 flex flex-col gap-2 border-t border-[var(--line)] pt-3 sm:flex-row sm:items-center" onSubmit={submitDelete}>
          <input
            type="password"
            value={deletePassword}
            onChange={(event) => onDeletePasswordChange(comment.id, event.currentTarget.value)}
            maxLength={80}
            className="w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--brand)] sm:w-44"
            placeholder="삭제 비밀번호"
            aria-label={`${comment.authorName} 댓글 삭제 비밀번호`}
          />
          <button
            type="submit"
            disabled={disabled}
            className="rounded-full border border-[var(--line)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            삭제
          </button>
        </form>
      </div>
    </article>
  );
}
