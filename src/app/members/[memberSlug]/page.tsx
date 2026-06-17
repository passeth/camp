import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentGrid } from "@/components/content-grid";
import { SectionHeader } from "@/components/section-header";
import { getEntriesByMember } from "@/lib/content";
import { getMemberBySlug, members } from "@/lib/members";

type PageProps = { params: Promise<{ memberSlug: string }> };

export function generateStaticParams() {
  return members.map((member) => ({ memberSlug: member.slug }));
}

export async function generateMetadata({ params }: PageProps) {
  const { memberSlug } = await params;
  const member = getMemberBySlug(memberSlug);
  return { title: member ? `${member.name} | Camp` : "Member | Camp" };
}

export default async function MemberDetailPage({ params }: PageProps) {
  const { memberSlug } = await params;
  const member = getMemberBySlug(memberSlug);
  if (!member) notFound();
  const entries = getEntriesByMember(member.slug);

  return (
    <div>
      <section className="grid gap-10 border-b border-[#e7e5dc] pb-12 pt-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
        <div>
          <Link href="/members" className="text-sm font-semibold text-[#5b6270] transition hover:text-[#171717]">Back to Members</Link>
          <div className="mt-8 flex h-20 w-20 items-center justify-center rounded-lg bg-[#171717] text-xl font-semibold text-white">{member.avatar}</div>
          <h1 className="mt-6 text-5xl font-medium tracking-[-0.055em] text-[#171717] sm:text-7xl">{member.name}</h1>
          <p className="mt-3 text-lg font-semibold text-[#277687]">{member.role}</p>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#5b6270]">{member.bio}</p>
        </div>
        <div className="rounded-lg border border-[#e7e5dc] bg-white p-6">
          <p className="text-xs font-semibold uppercase text-[#6d7280]">Profile links</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {member.links.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-full border border-[#171717] px-4 py-2 text-sm font-semibold transition hover:bg-[#171717] hover:text-white">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
      <SectionHeader eyebrow="Member archive" title="작성/관련 콘텐츠" description="이 멤버가 작성했거나 연결된 포스트를 모아 보여줍니다." />
      <ContentGrid entries={entries} emptyTitle="아직 콘텐츠가 없습니다" emptyDescription="이 멤버와 연결된 게시글이 추가되면 표시됩니다." />
    </div>
  );
}
