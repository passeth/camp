import Link from "next/link";
import { ContentCard } from "@/components/content-card";
import { PageHero } from "@/components/page-hero";
import { getLatestEntries } from "@/lib/content";

const pillars = [
  ["Recruit", "멤버, 주제, 기록을 한곳에 모아 맥락을 잃지 않습니다.", "/members"],
  ["Research", "Press, Daily, Study Log를 발행 흐름으로 정리합니다.", "/press"],
  ["Analyze", "Hermes가 요약과 Teach Page 생성을 맡도록 확장합니다.", "/agent"],
] as const;

export default function HomePage() {
  const latest = getLatestEntries(6);

  return (
    <div>
      <PageHero
        eyebrow="Camp study archive"
        title="Research at the pace of study"
        description="Camp는 스터디 노트를 매거진형 아카이브로 바꿉니다."
      />
      <section className="mb-20">
        <div className="mb-8 flex flex-wrap gap-2">
          {pillars.map(([title, , href]) => (
            <Link key={title} href={href} className="rounded-full border border-[#111111] bg-white px-5 py-2 text-sm font-semibold text-[#171717] transition hover:bg-[#111111] hover:text-white">
              {title}
            </Link>
          ))}
        </div>
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
          <div className="max-w-80 sm:max-w-none">
            <p className="text-xs font-semibold uppercase text-[#6d7280]">End-to-end study knowledge on one platform</p>
            <h2 className="mt-5 max-w-2xl break-words text-3xl font-medium leading-[1.08] tracking-[-0.045em] text-[#171717] sm:text-6xl sm:leading-[1.02]">
              대화에서 발행까지.
            </h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {pillars.map(([title, description]) => (
              <div key={title} className="rounded-lg border border-[#e7e5dc] bg-white p-5">
                <h3 className="text-lg font-semibold tracking-[-0.025em] text-[#171717]">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-[#5b6270]">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="mb-8 flex items-end justify-between gap-4 border-t border-[#e7e5dc] pt-12">
        <div>
          <p className="text-xs font-semibold uppercase text-[#6d7280]">Fresh insights</p>
          <h2 className="mt-2 text-4xl font-medium tracking-[-0.04em] text-[#171717]">최근 발행 콘텐츠</h2>
        </div>
        <Link href="/press" className="rounded-full border border-[#111111] bg-white px-5 py-2 text-sm font-semibold transition hover:bg-[#111111] hover:text-white">전체 보기</Link>
      </section>
      <section className="grid gap-x-9 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {latest.map((entry) => <ContentCard key={`${entry.type}-${entry.slug}`} entry={entry} />)}
      </section>
    </div>
  );
}
