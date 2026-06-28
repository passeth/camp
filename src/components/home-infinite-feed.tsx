"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ContentGrid } from "@/components/content-grid";
import type { ContentEntry } from "@/lib/content";

const INITIAL_VISIBLE_COUNT = 10;
const BATCH_SIZE = 10;

type HomeInfiniteFeedProps = {
  readonly entries: readonly ContentEntry[];
  readonly emptyTitle: string;
  readonly emptyDescription: string;
};

export function HomeInfiniteFeed({ entries, emptyDescription, emptyTitle }: HomeInfiniteFeedProps) {
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const visibleEntries = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount]);
  const hasMore = visibleCount < entries.length;

  useEffect(() => {
    if (!hasMore) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (items) => {
        if (!items.some((item) => item.isIntersecting)) return;
        setVisibleCount((current) => Math.min(current + BATCH_SIZE, entries.length));
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [entries.length, hasMore]);

  return (
    <div className="space-y-4">
      <ContentGrid entries={visibleEntries} emptyDescription={emptyDescription} emptyTitle={emptyTitle} />
      {hasMore ? (
        <div ref={sentinelRef} className="flex min-h-16 items-center justify-center">
          <button
            type="button"
            className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--muted)] transition hover:border-[var(--foreground)] hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--foreground)]"
            onClick={() => setVisibleCount((current) => Math.min(current + BATCH_SIZE, entries.length))}
          >
            더 보기
          </button>
        </div>
      ) : null}
    </div>
  );
}
