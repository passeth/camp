import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteContentPost, togglePinnedContentPost, updateContentPost } from "@/app/admin/content/actions";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { contentTypes, getEntryByTypeAndSlugAsync, type ContentType } from "@/lib/content";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ type?: string; slug?: string }> };

function parseType(value?: string): ContentType | undefined {
  return contentTypes.find((type) => type === value);
}

export default async function AdminContentEditPage({ searchParams }: PageProps) {
  await requireAdmin();
  const params = await searchParams;
  const type = parseType(params.type);
  const slug = params.slug;
  if (!type || !slug) notFound();

  const entry = await getEntryByTypeAndSlugAsync(type, slug, { includeUnpublished: true });
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <section className="border-b border-[#e7e5dc] pb-10 pt-10">
        <Link href="/admin/content" className="text-sm font-semibold text-[#5b6270] transition hover:text-[#171717]">
          Back to Content
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase text-[#6d7280]">Admin Edit</p>
        <h1 className="mt-3 max-w-4xl break-words text-5xl font-medium tracking-[-0.055em] text-[#171717]">{entry.title}</h1>
        <form action={togglePinnedContentPost} className="mt-5">
          <input type="hidden" name="type" value={entry.type} />
          <input type="hidden" name="slug" value={entry.slug} />
          <input type="hidden" name="pinned" value={entry.pinned ? "true" : "false"} />
          <button className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-semibold transition ${entry.pinned ? "border-[#ead99a] bg-[#fff4d6] text-[#8a5a00] hover:border-[#8a5a00]" : "border-[#e7e5dc] bg-white text-[#5b6270] hover:border-[#171717] hover:text-[#171717]"}`}>
            {entry.pinned ? "상단 고정 해제" : "상단 고정"}
          </button>
        </form>
      </section>
      <form action={updateContentPost} className="grid gap-5 rounded-lg border border-[#e7e5dc] bg-white p-6 md:p-8">
        <input type="hidden" name="originalType" value={entry.type} />
        <input type="hidden" name="originalSlug" value={entry.slug} />
        <input type="hidden" name="pinned" value={entry.pinned ? "true" : "false"} />
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-[#374151]">
            제목
            <input className="mt-2" name="title" required defaultValue={entry.title} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            Slug
            <input className="mt-2" name="slug" required defaultValue={entry.slug} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            메뉴
            <select className="mt-2" name="type" defaultValue={entry.type} required>
              <option value="study-log">Study Log</option>
              <option value="camp-session">Camp Session</option>
              <option value="wall-climb">벽타기</option>
              <option value="topic">Topics</option>
              <option value="press">News Digest</option>
              <option value="daily-review">Daily Review</option>
              <option value="teach">Teach</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[#374151]">
            작성자
            <input className="mt-2" name="author" required defaultValue={entry.author} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            Category
            <input className="mt-2" name="category" defaultValue={entry.category ?? ""} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            Tags
            <input className="mt-2" name="tags" defaultValue={entry.tags.join(", ")} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            본문 형식
            <select className="mt-2" name="sourceFormat" defaultValue={entry.contentFormat} required>
              <option value="html">HTML</option>
              <option value="markdown">Markdown</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[#374151]">
            요약
            <input className="mt-2" name="excerpt" defaultValue={entry.excerpt} />
          </label>
          <label className="text-sm font-medium text-[#374151]">
            연결 부모 타입
            <select className="mt-2" name="parentType" defaultValue={entry.replyTo?.type ?? ""}>
              <option value="">없음</option>
              <option value="study-log">Study Log</option>
              <option value="camp-session">Camp Session</option>
              <option value="wall-climb">벽타기</option>
              <option value="topic">Topics</option>
              <option value="press">News Digest</option>
              <option value="daily-review">Daily Review</option>
              <option value="teach">Teach</option>
            </select>
          </label>
          <label className="text-sm font-medium text-[#374151]">
            연결 부모 Slug
            <input className="mt-2" name="parentSlug" defaultValue={entry.replyTo?.slug ?? ""} />
          </label>
        </div>
        <label className="text-sm font-medium text-[#374151]">
          본문
          <textarea className="mt-2 min-h-[32rem] font-mono text-sm leading-6" name="sourceContent" required defaultValue={entry.content} />
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pendingText="저장 중...">수정 저장</SubmitButton>
        </div>
      </form>
      <form action={deleteContentPost} className="rounded-lg border border-[#e7e5dc] bg-white p-6">
        <input type="hidden" name="type" value={entry.type} />
        <input type="hidden" name="slug" value={entry.slug} />
        <button className="rounded-full border border-[#171717] bg-white px-5 py-3 text-sm font-semibold">
          삭제
        </button>
      </form>
    </div>
  );
}
