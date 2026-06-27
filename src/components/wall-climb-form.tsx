"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { createWallClimbPost } from "@/app/wall-climb/actions";

type WallSummary = {
  readonly canonicalUrl: string;
  readonly kind: "github" | "youtube" | "x" | "web";
  readonly summary: string;
  readonly title: string;
};

export function WallClimbForm({ action }: { readonly action: typeof createWallClimbPost }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState<WallSummary>();
  const [message, setMessage] = useState("");
  const [isSummarizing, startSummarizing] = useTransition();

  function summarize() {
    setMessage("");
    startSummarizing(async () => {
      const response = await fetch("/api/wall-climb/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note, url: sourceUrl }),
      });
      const payload = await response.json() as { readonly error?: string; readonly summary?: WallSummary };
      if (!response.ok || !payload.summary) {
        setMessage(payload.error ?? "요약을 만들지 못했습니다.");
        return;
      }
      setSummary(payload.summary);
      setMessage("요약이 준비되었습니다.");
    });
  }

  return (
    <form id="wall-form" action={action} className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
      <input type="hidden" name="summary" value={summary?.summary ?? ""} />
      <input type="hidden" name="sourceTitle" value={summary?.title ?? ""} />
      <input type="hidden" name="sourceKind" value={summary?.kind ?? ""} />
      <input type="hidden" name="canonicalUrl" value={summary?.canonicalUrl ?? ""} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="text-sm font-medium text-[#374151]">
          링크
          <input
            className="mt-2"
            name="sourceUrl"
            type="url"
            required
            placeholder="https://youtube.com/... 또는 https://github.com/..."
            value={sourceUrl}
            onChange={(event) => setSourceUrl(event.target.value)}
          />
        </label>
        <label className="text-sm font-medium text-[#374151]">
          작성자
          <input className="mt-2" name="authorName" required placeholder="닉네임" />
        </label>
      </div>
      <label className="text-sm font-medium text-[#374151]">
        공유 멘트
        <textarea
          className="mt-2 min-h-28 text-sm leading-6"
          name="note"
          required
          placeholder="채팅방에 함께 올라온 멘트나 내가 남기고 싶은 맥락을 적어주세요."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      {summary ? (
        <section className="rounded-lg bg-[var(--surface-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{summary.kind}</p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{summary.title}</p>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{summary.summary}</p>
        </section>
      ) : null}
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
        <button
          type="button"
          onClick={summarize}
          disabled={isSummarizing || !sourceUrl.trim() || !note.trim()}
          className="inline-flex h-10 items-center justify-center rounded-full border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSummarizing ? "요약 중..." : "요약"}
        </button>
        <SubmitButton pendingText="게시 중...">벽타기 등록</SubmitButton>
      </div>
    </form>
  );
}
