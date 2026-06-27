import { SubmitButton } from "@/components/submit-button";
import { contentTypes } from "@/lib/content";
import { createPublishPost } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string; replyToSlug?: string; replyToTitle?: string; replyToType?: string; status?: string }> };

function parseReplyTo(type?: string, slug?: string) {
  if (!type || !slug) return undefined;
  const contentType = contentTypes.find((candidate) => candidate === type);
  if (!contentType) return undefined;
  return { type: contentType, slug };
}

export default async function WritePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const replyTo = parseReplyTo(params.replyToType, params.replyToSlug);

  return (
    <div className="space-y-8">
      <section className="border-b border-[#e7e5dc] pb-12 pt-10">
        <h1 className="text-5xl font-medium tracking-[-0.055em] text-[#171717] sm:text-7xl">게시글 올리기</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5b6270]">올릴 메뉴와 파일 형식을 고르면 바로 게시됩니다.</p>
        {replyTo ? (
          <p className="mt-5 rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6 text-[var(--muted)]">
            <span className="font-semibold text-[var(--foreground)]">{params.replyToTitle ?? "선택한 게시글"}</span>의 답글 게시글로 연결됩니다.
          </p>
        ) : null}
        {params.error ? <p className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-sm text-[#8a5a00]">입력값을 확인하거나 잠시 후 다시 시도하세요.</p> : null}
        {params.status === "published" ? <p className="mt-5 rounded-2xl bg-[#eef9ef] p-4 text-sm text-[#256232]">게시글이 공개되었습니다.</p> : null}
      </section>
      <form action={createPublishPost} className="grid gap-5 rounded-lg border border-[#e7e5dc] bg-white p-6 md:p-8">
        {replyTo ? (
          <>
            <input type="hidden" name="parentType" value={replyTo.type} />
            <input type="hidden" name="parentSlug" value={replyTo.slug} />
          </>
        ) : null}
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-[#374151]">작성자<input className="mt-2" name="authorName" required placeholder="홍길동" /></label>
          <label className="text-sm font-medium text-[#374151]">제목<input className="mt-2" name="title" required placeholder="첫 스터디 기록" /></label>
          <label className="text-sm font-medium text-[#374151]">올릴 메뉴
            <select className="mt-2" name="type" defaultValue="study-log" required>
              <option value="study-log">Study Log</option>
              <option value="topic">Topics</option>
              <option value="press">News Digest</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[#374151]">파일 형식
            <select className="mt-2" name="uploadFormat" defaultValue="markdown" required>
              <option value="markdown">Markdown</option>
              <option value="html">HTML</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[#374151] md:col-span-2">파일<input className="mt-2" name="contentFile" type="file" accept=".md,.markdown,.html,.htm,text/markdown,text/html" required /></label>
        </div>
        <SubmitButton pendingText="업로드 중...">파일 업로드</SubmitButton>
      </form>
    </div>
  );
}
