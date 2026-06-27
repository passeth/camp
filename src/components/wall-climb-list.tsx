import Link from "next/link";
import { WallLinkPreview } from "@/components/wall-link-preview";
import type { ContentEntry } from "@/lib/content";

export function WallClimbList({ entries }: { readonly entries: readonly ContentEntry[] }) {
  if (entries.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-[var(--line)] bg-[var(--surface)] p-8">
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-[var(--foreground)]">아직 벽타기 링크가 없습니다</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">채팅방에 올라온 링크와 멘트를 첫 항목으로 남겨보세요.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      {entries.map((entry) => (
        <article key={`${entry.type}:${entry.slug}`} className="rounded-lg border border-[var(--line)] bg-[var(--surface)] p-4">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,0.8fr)_minmax(0,1fr)]">
            <WallLinkPreview entry={entry} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--muted)]">
                <span>벽타기</span>
                <span>{entry.author}</span>
                <span>{entry.publishedAt ?? entry.createdAt}</span>
              </div>
              <Link href={entry.href} className="mt-3 block break-words text-xl font-semibold leading-tight tracking-[-0.035em] text-[var(--foreground)] transition hover:text-[#277687]">
                {entry.title}
              </Link>
              <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{entry.note ?? entry.excerpt}</p>
            </div>
            <div className="min-w-0 rounded-lg bg-[var(--surface-soft)] p-4">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">DeepSeek summary</p>
              <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">{entry.summary ?? entry.excerpt}</p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
