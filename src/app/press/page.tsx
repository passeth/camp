import { ContentGrid } from "@/components/content-grid";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByType } from "@/lib/content";

export default function PressPage() {
  const entries = getEntriesByType("press");
  return (
    <div>
      <PageHero eyebrow="Press" title="멤버들의 매거진" description="스터디 멤버별 관점, 프로젝트 회고, 발표 자료를 매거진처럼 발행하는 공간입니다." />
      <SectionHeader eyebrow="Magazine desk" title="Published stories" description="멤버의 관점과 스터디의 흐름을 공개 가능한 글로 모읍니다." />
      <ContentGrid entries={entries} emptyTitle="아직 Press가 없습니다" emptyDescription="첫 게시글을 작성하면 이곳에 표시됩니다." />
    </div>
  );
}
