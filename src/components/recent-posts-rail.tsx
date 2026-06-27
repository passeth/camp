import Link from "next/link";
import type { ContentEntry } from "@/lib/content";

type RecentPostsRailProps = {
  readonly entries: readonly ContentEntry[];
};

export function RecentPostsRail({ entries }: RecentPostsRailProps) {
  return (
    <aside className="min-w-0 pb-10 xl:block">
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">최근 게시물</h2>
          <Link href="/study-log" className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
            전체
          </Link>
        </div>
        <div className="mt-4 divide-y divide-[var(--line)]">
          {entries.map((entry) => (
            <Link key={`${entry.type}-${entry.slug}`} href={entry.href} className="block py-3 transition hover:translate-x-1">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{entry.category ?? entry.type}</p>
              <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 tracking-[-0.025em] text-[var(--foreground)]">{entry.title}</h3>
              <p className="mt-1 text-xs text-[var(--muted)]">{entry.publishedAt ?? entry.createdAt}</p>
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}
