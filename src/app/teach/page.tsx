import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByTypeAsync } from "@/lib/content";
import { filterEntriesByTag } from "@/lib/tags";

type PageProps = { searchParams: Promise<{ tag?: string }> };

export default async function TeachPage({ searchParams }: PageProps) {
  const { tag } = await searchParams;
  const entries = filterEntriesByTag(await getEntriesByTypeAsync("teach"), tag);
  return (
    <div>
      <PageHero eyebrow="Teach Pages" title={tag ? `#${tag}` : "AI가 생성하는 학습 페이지"} description="주제별 설명, 예제, 연습 문제를 하나의 학습 페이지로 저장하는 공간입니다. MVP에서는 Markdown으로 시작합니다." />
      <SectionHeader eyebrow="Learning pages" title="Teach-ready notes" description="설명, 예제, 연습을 하나의 학습 페이지로 묶어 재사용합니다." />
      <ContentGrid entries={entries} emptyTitle="Teach Page가 없습니다" emptyDescription="Hermes 연동 전까지는 Markdown 페이지로 운영합니다." />
    </div>
  );
}
