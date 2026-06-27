import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByType } from "@/lib/content";

export default function StudyLogPage() {
  const entries = getEntriesByType("study-log");
  return (
    <div>
      <PageHero eyebrow="Study Log" title="스터디 로그" description="모임에서 사용한 덱과 기록을 게시글처럼 모아 바로 열람합니다." showVisual={false} />
      <SectionHeader eyebrow="Meeting record" title="Session outcomes" description="스터디의 주제, 결정, 다음 액션을 나중에 다시 찾기 쉬운 형태로 남깁니다." />
      <ContentGrid entries={entries} emptyTitle="Study Log가 없습니다" emptyDescription="첫 스터디 로그를 작성하면 표시됩니다." showCardVisuals={false} />
    </div>
  );
}
