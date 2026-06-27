import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByTypeAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";

type PageProps = { searchParams: Promise<{ tag?: string }> };

export default async function CampSessionPage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const entries = filterEntriesByTag(await getEntriesByTypeAsync("camp-session"), tag);

  return (
    <div>
      <PageHero eyebrow="Camp Session" title={tag ? `#${tag}` : "캠프 세션"} description="부트캠프 주차별 학습자료와 실습 노트를 모아둡니다." showVisual={false} />
      <SectionHeader eyebrow="Bootcamp materials" title="Weekly learning resources" description="주차별 자료, 과제, 참고 링크를 게시글 단위로 정리합니다." />
      <ContentGrid entries={entries} emptyTitle="아직 Camp Session 자료가 없습니다" emptyDescription="첫 주차별 학습자료를 올리면 이곳에 표시됩니다." showCardVisuals={false} />
    </div>
  );
}
