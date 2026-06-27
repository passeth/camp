import Link from "next/link";
import { CommunityNav } from "@/components/community-nav";

export function CommunitySidebar() {
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
      </div>
    </aside>
  );
}
