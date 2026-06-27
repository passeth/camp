import { notFound } from "next/navigation";
import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { PostLayout } from "@/components/post-layout";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByType, getEntryByTypeAndSlugAsync, getTopicSubtreeAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<{ tag?: string }>;
};

export function generateStaticParams() {
  return [
    {},
    ...getEntriesByType("topic").map((entry) => ({ slug: entry.slug.split("/") })),
  ];
}

export default async function TopicsPage({ params, searchParams }: PageProps) {
  const { slug = [] } = await params;
  const { tag } = await searchParams;
  const slugPath = slug.join("/");
  const [entry, subtree] = await Promise.all([
    slugPath ? getEntryByTypeAndSlugAsync("topic", slugPath) : Promise.resolve(null),
    getTopicSubtreeAsync(slug),
  ]);

  if (slugPath && !entry && subtree.length === 0) notFound();

  if (entry) {
    return <PostLayout entry={entry} backHref="/topics" backLabel="Topics" />;
  }

  return (
    <div>
      <PageHero eyebrow="Topics" title={tag ? `#${tag}` : "주제별 학습 노트"} description="폴더와 하위 폴더 구조를 웹 메뉴로 확장할 수 있도록 설계한 Markdown 지식 베이스입니다." showVisual={false} />
      <SectionHeader eyebrow="Knowledge base" title="Topic notes" description="폴더 구조를 그대로 살려 주제별 노트와 하위 학습 흐름을 탐색합니다." />
      <ContentGrid entries={filterEntriesByTag(subtree, tag)} emptyTitle="아직 Topic 노트가 없습니다" emptyDescription="content/topics 폴더에 Markdown을 추가하면 표시됩니다." />
    </div>
  );
}
