import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { SectionHeader } from "@/components/section-header";
import { members } from "@/lib/members";

export default function MembersPage() {
  return (
    <div>
      <PageHero eyebrow="Members" title="스터디 멤버" description="멤버 소개와 멤버별 Press를 연결하는 공개 프로필 공간입니다." />
      <SectionHeader eyebrow="People behind the archive" title="Member profiles" description="각 멤버의 역할과 연결된 포스트를 한눈에 탐색합니다." />
      <section className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        {members.map((member) => (
          <Link key={member.slug} href={`/members/${member.slug}`} className="group rounded-lg border border-[#e7e5dc] bg-white p-6 transition hover:-translate-y-1">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#171717] font-semibold text-white">{member.avatar}</div>
              <span className="h-px flex-1 bg-[#e7e5dc]" />
            </div>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#171717] transition group-hover:text-[#277687]">{member.name}</h2>
            <p className="mt-2 text-sm font-semibold text-[#277687]">{member.role}</p>
            <p className="mt-5 text-sm leading-6 text-[#5b6270]">{member.bio}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
