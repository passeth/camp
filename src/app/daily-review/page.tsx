import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByType } from "@/lib/content";

export default function DailyReviewPage() {
  const entries = getEntriesByType("daily-review");
  return (
    <div>
      <PageHero eyebrow="Daily Review" title="매일의 대화를 학습 기록으로" description="메신저와 회의에서 나온 흐름을 하루 단위로 요약하고, 나중에 Hermes가 자동 정리할 수 있도록 준비합니다." />
      <SectionHeader eyebrow="Daily archive" title="Conversation summaries" description="하루의 논의와 결정이 포스트 구조로 남도록 정리합니다." />
      <ContentGrid entries={entries} emptyTitle="Daily Review가 없습니다" emptyDescription="첫 리뷰 Markdown을 추가하면 표시됩니다." />
    </div>
  );
}
