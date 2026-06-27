import Link from "next/link";
import { ContentGrid } from "@/components/content-grid";
import { getAllContentEntriesAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";

type PageProps = { searchParams: Promise<{ tag?: string }> };

export default async function HomePage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const latest = filterEntriesByTag(await getAllContentEntriesAsync(), tag).slice(0, 6);

  return (
    <div>
      <section className="mb-5 rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Camp study archive</p>
            <h1 className="mt-2 text-3xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] sm:text-4xl">{tag ? `#${tag}` : "최근 게시글"}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">스터디 기록, 자료, 질문을 게시글과 댓글로 이어가는 커뮤니티 피드입니다.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-[var(--muted)]">
            <span className="rounded-full bg-[var(--surface-soft)] px-3 py-1">{latest.length} posts</span>
            <Link href="/write" className="rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-3 py-1 text-white transition hover:opacity-80" style={{ color: "#fff" }}>
              글쓰기
            </Link>
          </div>
        </div>
      </section>
      <section className="mb-4 flex items-center justify-between gap-4">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Community feed</p>
        <Link href="/study-log" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition hover:border-[var(--foreground)]">전체 보기</Link>
      </section>
      <ContentGrid entries={latest} emptyTitle="아직 게시글이 없습니다" emptyDescription="첫 게시글을 올리면 커뮤니티 피드에 표시됩니다." />
    </div>
  );
}
