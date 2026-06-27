import Link from "next/link";
import type { ContentEntry } from "@/lib/content";
import type { LinkedChildPost } from "@/lib/comment-counts";

type RecentPostsRailProps = {
  readonly entries: readonly ContentEntry[];
  readonly childPostsByParentKey?: Readonly<Record<string, readonly LinkedChildPost[]>>;
  readonly linkedPostKeys?: readonly string[];
  readonly replyCounts?: Readonly<Record<string, number>>;
};

function entryKey(entry: Pick<ContentEntry, "type" | "slug">) {
  return `${entry.type}:${entry.slug}`;
}

export function RecentPostsRail({ childPostsByParentKey = {}, entries, linkedPostKeys = [], replyCounts = {} }: RecentPostsRailProps) {
  const linkedKeys = new Set(linkedPostKeys);

  return (
    <aside className="min-w-0 pb-10 xl:block">
      <div className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">최근 게시물</h2>
          <Link href="/study-log" className="text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--foreground)]">
            전체
          </Link>
        </div>
        <div className="mt-4">
          {entries.map((entry, index) => {
            const key = entryKey(entry);
            const replyCount = replyCounts[key] ?? 0;
            const isLinked = linkedKeys.has(key);
            const childPosts = childPostsByParentKey[key] ?? [];

            return (
              <div key={key} className={`relative py-3 ${index > 0 ? "border-t border-[var(--line)]" : ""} ${isLinked ? "pl-5" : ""}`}>
                {isLinked ? (
                  <span className="absolute bottom-3 left-1.5 top-3 w-px bg-[#c8d2cc]" aria-hidden="true">
                    <span className="absolute left-1/2 top-1.5 h-2 w-2 -translate-x-1/2 rounded-full border border-[#8ba39a] bg-white transition" />
                  </span>
                ) : null}
                <Link href={entry.href} className="group block transition hover:translate-x-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">{entry.category ?? entry.type}</p>
                    <p className="shrink-0 rounded-full bg-[var(--surface-soft)] px-2 py-0.5 text-[0.68rem] font-semibold text-[var(--muted)]">답글 {replyCount}</p>
                  </div>
                  <h3 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 tracking-[-0.025em] text-[var(--foreground)]">{entry.title}</h3>
                  <p className="mt-1 text-xs text-[var(--muted)]">{entry.publishedAt ?? entry.createdAt}</p>
                </Link>
                {childPosts.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l border-[#d9e1dd] pl-3">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">연결된 게시글 {childPosts.length}</p>
                    {childPosts.slice(0, 3).map((child) => (
                      <Link key={`${child.type}:${child.href}`} href={child.href} className="block text-xs leading-5 text-[var(--muted)] transition hover:text-[var(--foreground)]">
                        <span className="font-semibold uppercase">{child.type}</span> {child.title}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
