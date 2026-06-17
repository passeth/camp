import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByType } from "@/lib/content";

export default function StudyLogPage() {
  const entries = getEntriesByType("study-log");
  return (
    <div>
      <PageHero eyebrow="Study Log" title="스터디 모임 기록" description="모임에서 다룬 주제, 결정, 다음 액션을 남기는 공간입니다." />
      <SectionHeader eyebrow="Meeting record" title="Session outcomes" description="스터디의 주제, 결정, 다음 액션을 나중에 다시 찾기 쉬운 형태로 남깁니다." />
      <ContentGrid entries={entries} emptyTitle="Study Log가 없습니다" emptyDescription="첫 스터디 로그를 작성하면 표시됩니다." />
    </div>
  );
}
