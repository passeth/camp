import { ContentCard } from "@/components/content-card";
import { EmptyState } from "@/components/empty-state";
import type { ContentEntry } from "@/lib/content";

type ContentGridProps = {
  readonly entries: readonly ContentEntry[];
  readonly emptyTitle: string;
  readonly emptyDescription: string;
};

export function ContentGrid({ entries, emptyTitle, emptyDescription }: ContentGridProps) {
  if (entries.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <section className="grid gap-x-9 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
      {entries.map((entry) => (
        <ContentCard key={`${entry.type}-${entry.slug}`} entry={entry} />
      ))}
    </section>
  );
}
