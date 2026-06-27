"use client";

import { useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { createWallClimbPost } from "@/app/wall-climb/actions";

type WallSummary = {
  readonly canonicalUrl: string;
  readonly imageUrl?: string;
  readonly kind: "github" | "youtube" | "x" | "web";
  readonly summary: string;
  readonly title: string;
};

export function WallClimbForm({ action }: { readonly action: typeof createWallClimbPost }) {
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [summary, setSummary] = useState<WallSummary>();
  const [message, setMessage] = useState("");
  const [isSummarizing, startSummarizing] = useTransition();

  function summarize() {
    setMessage("");
    startSummarizing(async () => {
      try {
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
        setSummaryText(payload.summary.summary);
        setMessage("요약이 준비되었습니다.");
      } catch {
        setMessage("요약 요청에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      }
    });
  }

  return (
    <form id="wall-form" action={action} className="grid gap-4 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4 md:p-5">
      <input type="hidden" name="sourceTitle" value={summary?.title ?? ""} />
      <input type="hidden" name="sourceImage" value={summary?.imageUrl ?? ""} />
      <input type="hidden" name="sourceKind" value={summary?.kind ?? ""} />
      <input type="hidden" name="canonicalUrl" value={summary?.canonicalUrl ?? ""} />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
        <label className="text-sm font-medium text-[#374151]">
          링크
          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              className="min-w-0"
              name="sourceUrl"
              type="url"
              required
              placeholder="https://youtube.com/... 또는 https://github.com/..."
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
            />
            <button
              type="button"
              onClick={summarize}
              disabled={isSummarizing || !sourceUrl.trim()}
              className="inline-flex h-12 items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSummarizing ? "요약 중..." : "요약"}
            </button>
          </div>
        </label>
        <label className="text-sm font-medium text-[#374151]">
          작성자
          <input className="mt-2" name="authorName" required placeholder="닉네임" />
        </label>
      </div>
      <label className="text-sm font-medium text-[#374151]">
        공유 멘트
        <textarea
          className="mt-2 h-20 !min-h-20 text-sm leading-6 md:h-24 md:!min-h-24"
          name="note"
          required
          placeholder="채팅방에 함께 올라온 멘트나 내가 남기고 싶은 맥락을 적어주세요."
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <label className="text-sm font-medium text-[#374151]">
        요약
        <textarea
          className="mt-2 h-24 !min-h-24 text-sm leading-6"
          name="summary"
          placeholder="요약 버튼을 누르면 링크 내용 기반 요약이 생성됩니다. 직접 입력하거나 수정할 수도 있습니다."
          value={summaryText}
          onChange={(event) => setSummaryText(event.target.value)}
        />
      </label>
      <label className="text-sm font-medium text-[#374151]">
        해시태그
        <input
          className="mt-2"
          name="tags"
          placeholder="#ai #frontend 또는 ai, frontend"
        />
      </label>
      {summary ? (
        <section className="rounded-lg bg-[var(--surface-soft)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{summary.kind}</p>
          <p className="mt-1 text-base font-semibold text-[var(--foreground)]">{summary.title}</p>
          {summary.imageUrl ? (
            <div
              className="mt-3 aspect-video max-w-sm rounded-lg bg-[#171717] bg-cover bg-center"
              style={{ backgroundImage: `url(${summary.imageUrl})` }}
              aria-label={summary.title}
            />
          ) : null}
        </section>
      ) : null}
      {message ? <p className="text-sm text-[var(--muted)]">{message}</p> : null}
      <div className="flex justify-end">
        <SubmitButton pendingText="게시 중...">벽타기 등록</SubmitButton>
      </div>
    </form>
  );
}
