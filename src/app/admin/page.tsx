import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <section className="border-b border-[#e7e5dc] pb-12 pt-10">
        <p className="text-xs font-semibold uppercase text-[#6d7280]">Admin</p>
        <h1 className="mt-3 text-5xl font-medium tracking-[-0.055em] text-[#171717] sm:text-7xl">운영 관리</h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-[#5b6270]">멤버 승인과 게시 요청 검토를 처리합니다. Git/VPS 자동 게시 연결은 후속 단계에서 이 경계에 붙입니다.</p>
      </section>
      <section className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
        <Link href="/admin/members" className="rounded-lg border border-[#e7e5dc] bg-white p-6 transition hover:-translate-y-1"><h2 className="text-2xl font-semibold tracking-[-0.035em] text-[#171717]">멤버 승인</h2><p className="mt-3 text-sm leading-6 text-[#5b6270]">pending/member/admin 역할을 관리합니다.</p></Link>
        <Link href="/admin/publish-requests" className="rounded-lg border border-[#e7e5dc] bg-white p-6 transition hover:-translate-y-1"><h2 className="text-2xl font-semibold tracking-[-0.035em] text-[#171717]">게시 요청</h2><p className="mt-3 text-sm leading-6 text-[#5b6270]">웹 에디터에서 제출한 Markdown 초안을 검토합니다.</p></Link>
      </section>
    </div>
  );
}
