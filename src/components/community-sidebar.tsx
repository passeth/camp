import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";
import type { TagSummary } from "@/lib/tags";
import { tagHref } from "@/lib/tags";

export function CommunitySidebar({ tags = [] }: { readonly tags?: readonly TagSummary[] }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 space-y-4">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-3">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Menu</p>
          <CommunityNav variant="side" />
        </section>
        <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Community</p>
          <h2 className="mt-2 text-lg font-semibold tracking-[-0.035em] text-[var(--foreground)]">스터디 기록실</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">모임 기록, 자료, 질문을 게시글 단위로 쌓고 댓글로 이어갑니다.</p>
          <Link
            href="/write"
            style={{ color: "#fff" }}
            className="mt-4 inline-flex w-full justify-center rounded-full border border-[var(--foreground)] bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-80"
          >
            게시글 올리기
          </Link>
        </section>
        {tags.length > 0 ? (
          <section className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">Hashtags</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {tags.map((summary) => (
                <Link
                  key={summary.tag}
                  href={tagHref(summary.tag)}
                  className="rounded-full bg-[var(--surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--muted)] transition hover:bg-white hover:text-[var(--foreground)]"
                >
                  #{summary.tag} <span className="font-medium opacity-70">{summary.count}</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </aside>
  );
}
