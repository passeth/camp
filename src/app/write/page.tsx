import { SubmitButton } from "@/components/submit-button";
import { requireMember } from "@/lib/auth";
import { createPublishRequest } from "./actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ error?: string }> };

export default async function WritePage({ searchParams }: PageProps) {
  const params = await searchParams;
  await requireMember();

  return (
    <div className="space-y-8">
      <section className="border-b border-[#e7e5dc] pb-12 pt-10">
        <p className="text-xs font-semibold uppercase text-[#6d7280]">Write</p>
        <h1 className="mt-3 text-5xl font-medium tracking-[-0.055em] text-[#171717] sm:text-7xl">게시 요청 작성</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5b6270]">본문 원본은 Markdown입니다. 제출된 글은 Supabase의 게시 요청 큐에 저장되고, 관리자 승인 후 Markdown 파일로 반영됩니다.</p>
        {params.error ? <p className="mt-5 rounded-2xl bg-[#fff4d6] p-4 text-sm text-[#8a5a00]">입력값을 확인하거나 잠시 후 다시 시도하세요.</p> : null}
      </section>
      <form action={createPublishRequest} className="grid gap-5 rounded-lg border border-[#e7e5dc] bg-white p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-medium text-[#374151]">제목<input className="mt-2" name="title" required placeholder="RAG 기초 노트" /></label>
          <label className="text-sm font-medium text-[#374151]">Slug<input className="mt-2" name="slug" required placeholder="ai-basics/rag-foundations" /></label>
          <label className="text-sm font-medium text-[#374151]">Type<select className="mt-2" name="type" defaultValue="press"><option value="press">Press</option><option value="topic">Topic</option><option value="daily-review">Daily Review</option><option value="study-log">Study Log</option><option value="teach">Teach</option></select></label>
          <label className="text-sm font-medium text-[#374151]">Category<input className="mt-2" name="category" placeholder="AI Basics" /></label>
        </div>
        <label className="text-sm font-medium text-[#374151]">Tags, comma separated<input className="mt-2" name="tags" placeholder="rag, llm, retrieval" /></label>
        <label className="text-sm font-medium text-[#374151]">Markdown<textarea className="mt-2 font-mono text-sm" name="markdown" required defaultValue={"# 제목\n\n요약 문단을 작성하세요.\n\n## 핵심\n\n- 첫 번째 포인트\n- 두 번째 포인트"} /></label>
        <SubmitButton pendingText="제출 중...">게시 요청 제출</SubmitButton>
      </form>
    </div>
  );
}
