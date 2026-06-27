"use client";

import { useMemo, useState, useTransition } from "react";
import { SubmitButton } from "@/components/submit-button";
import type { ContentType } from "@/lib/content";
import type { createPublishPost } from "./actions";

type ReplyTo = {
  readonly type: ContentType;
  readonly slug: string;
  readonly title?: string;
};

type LinkDraft = {
  readonly title: string;
  readonly category: string;
  readonly tags: readonly string[];
  readonly markdown: string;
};

type WritePostFormProps = {
  readonly action: typeof createPublishPost;
  readonly replyTo?: ReplyTo;
};

export function WritePostForm({ action, replyTo }: WritePostFormProps) {
  const [linkUrl, setLinkUrl] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [generatedMarkdown, setGeneratedMarkdown] = useState("");
  const [draftError, setDraftError] = useState("");
  const [isGenerating, startGenerating] = useTransition();

  const hasGeneratedDraft = generatedMarkdown.trim().length > 0;
  const helperText = useMemo(() => {
    if (hasGeneratedDraft) return "생성된 마크다운을 검토한 뒤 바로 게시하거나 아래 본문에 직접 붙여 넣어 게시할 수 있습니다.";
    return "파일을 올리거나, 본문을 직접 입력하거나, GitHub/YouTube 링크로 초안을 만든 뒤 게시하세요.";
  }, [hasGeneratedDraft]);

  function generateDraft() {
    const trimmedUrl = linkUrl.trim();
    if (!trimmedUrl) {
      setDraftError("요약할 링크를 입력해 주세요.");
      return;
    }

    setDraftError("");
    startGenerating(async () => {
      try {
        const response = await fetch("/api/link-drafts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: trimmedUrl }),
        });
        const payload = await response.json() as { readonly draft?: LinkDraft; readonly error?: string };
        if (!response.ok || !payload.draft) {
          throw new Error(payload.error ?? "초안을 만들지 못했습니다.");
        }

        setTitle(payload.draft.title);
        setCategory(payload.draft.category);
        setTags(payload.draft.tags.join(", "));
        setGeneratedMarkdown(payload.draft.markdown);
      } catch (error) {
        setDraftError(error instanceof Error ? error.message : "초안을 만들지 못했습니다.");
      }
    });
  }

  return (
    <form action={action} className="grid gap-5 rounded-lg border border-[var(--line)] bg-white p-6 md:p-8">
      {replyTo ? (
        <>
          <input type="hidden" name="parentType" value={replyTo.type} />
          <input type="hidden" name="parentSlug" value={replyTo.slug} />
        </>
      ) : null}
      <input type="hidden" name="generatedMarkdown" value={generatedMarkdown} />
      <div className="grid gap-5 md:grid-cols-2">
        <label className="text-sm font-medium text-[#374151]">
          작성자
          <input className="mt-2" name="authorName" required placeholder="홍길동" />
        </label>
        <label className="text-sm font-medium text-[#374151]">
          제목
          <input className="mt-2" name="title" required placeholder="첫 스터디 기록" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-[#374151]">
          올릴 메뉴
          <select className="mt-2" name="type" defaultValue="study-log" required>
            <option value="study-log">Study Log</option>
            <option value="camp-session">Camp Session</option>
            <option value="topic">Topics</option>
            <option value="press">News Digest</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#374151]">
          직접 입력 형식
          <select className="mt-2" name="uploadFormat" defaultValue="markdown" required>
            <option value="markdown">Markdown</option>
            <option value="html">HTML</option>
          </select>
        </label>
        <label className="text-sm font-medium text-[#374151] md:col-span-2">
          GitHub 또는 YouTube 링크
          <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              name="sourceUrl"
              type="url"
              placeholder="https://github.com/... 또는 https://youtube.com/watch?v=..."
              value={linkUrl}
              onChange={(event) => setLinkUrl(event.target.value)}
            />
            <button
              type="button"
              onClick={generateDraft}
              disabled={isGenerating}
              className="rounded-lg bg-[var(--foreground)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isGenerating ? "초안 생성 중..." : "초안 만들기"}
            </button>
          </div>
        </label>
        <label className="text-sm font-medium text-[#374151] md:col-span-2">
          파일
          <input className="mt-2" name="contentFile" type="file" accept=".md,.markdown,.html,.htm,text/markdown,text/html" />
        </label>
        <label className="text-sm font-medium text-[#374151] md:col-span-2">
          본문
          <textarea
            className="mt-2 min-h-56 text-sm leading-6"
            name="manualContent"
            placeholder="파일 없이 바로 올릴 Markdown 또는 HTML 본문을 붙여 넣으세요."
          />
        </label>
        <label className="text-sm font-medium text-[#374151]">
          Category
          <input className="mt-2" name="category" placeholder="AI Tools" value={category} onChange={(event) => setCategory(event.target.value)} />
        </label>
        <label className="text-sm font-medium text-[#374151]">
          Tags
          <input className="mt-2" name="tags" placeholder="github, youtube, ai" value={tags} onChange={(event) => setTags(event.target.value)} />
        </label>
      </div>
      {draftError ? <p className="rounded-lg bg-[var(--status-warning-bg)] px-4 py-3 text-sm text-[var(--status-warning-text)]">{draftError}</p> : null}
      {hasGeneratedDraft ? (
        <label className="text-sm font-medium text-[#374151]">
          생성된 마크다운
          <textarea
            className="mt-2 min-h-96 font-mono text-sm leading-6"
            value={generatedMarkdown}
            onChange={(event) => setGeneratedMarkdown(event.target.value)}
          />
        </label>
      ) : null}
      <p className="text-sm leading-6 text-[var(--muted)]">{helperText}</p>
      <SubmitButton pendingText="게시 중...">게시하기</SubmitButton>
    </form>
  );
}
