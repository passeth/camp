import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByTypeAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";

type PageProps = { searchParams: Promise<{ tag?: string }> };

export default async function PressPage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const entries = filterEntriesByTag(await getEntriesByTypeAsync("press"), tag);
  return (
    <div>
      <PageHero eyebrow="News Digest" title={tag ? `#${tag}` : "뉴스 다이제스트"} description="스터디와 연결된 소식, 자료, 외부 흐름을 짧게 정리해 모읍니다." showVisual={false} />
      <SectionHeader eyebrow="Digest desk" title="Published digests" description="나중에 다시 볼 만한 소식과 참고 자료를 한곳에 정리합니다." />
      <ContentGrid entries={entries} emptyTitle="아직 News Digest가 없습니다" emptyDescription="첫 다이제스트를 작성하면 이곳에 표시됩니다." />
    </div>
  );
}
