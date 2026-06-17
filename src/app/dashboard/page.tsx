import Link from "next/link";
import { StatusPill } from "@/components/status-pill";
import { getAuthContext } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/login/actions";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ status?: string }> };

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const context = await getAuthContext();

  if (!context) {
    return (
      <div className="border-t border-[#171717] pt-10">
        <h1 className="text-4xl font-medium tracking-[-0.04em] text-[#171717]">로그인이 필요합니다</h1>
        <p className="mt-3 text-[#5b6270]">멤버 대시보드는 로그인 후 사용할 수 있습니다.</p>
        <Link href="/login" className="mt-6 inline-flex rounded-full bg-[#171717] px-5 py-3 text-sm font-semibold text-white">로그인</Link>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("publish_requests")
    .select("id, title, type, status, created_at")
    .eq("user_id", context.user.id)
    .order("created_at", { ascending: false })
    .limit(10);

  const approved = context.role === "member" || context.role === "admin";

  return (
    <div className="space-y-8">
      <section className="border-b border-[#e7e5dc] pb-12 pt-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase text-[#6d7280]">Dashboard</p>
            <h1 className="mt-3 text-5xl font-medium tracking-[-0.055em] text-[#171717]">{context.profile?.display_name ?? context.user.email}</h1>
            <div className="mt-4 flex flex-wrap gap-2"><StatusPill tone={approved ? "good" : "warn"}>{context.role}</StatusPill>{params.status ? <StatusPill>{params.status}</StatusPill> : null}</div>
          </div>
          <form action={signOut}><button className="rounded-full border border-[#171717] bg-white px-4 py-2 text-sm font-medium">로그아웃</button></form>
        </div>
        {!approved ? <p className="mt-6 rounded-2xl bg-[#fff4d6] p-4 text-sm text-[#8a5a00]">관리자 승인 후 글쓰기와 Agent 페이지를 사용할 수 있습니다.</p> : null}
        {approved ? <div className="mt-8 flex flex-wrap gap-3"><Link href="/write" className="rounded-full bg-[#171717] px-5 py-3 text-sm font-semibold text-white">글쓰기</Link><Link href="/agent" className="rounded-full border border-[#171717] px-5 py-3 text-sm font-semibold">Agent 페이지</Link>{context.role === "admin" ? <Link href="/admin" className="rounded-full border border-[#171717] px-5 py-3 text-sm font-semibold">Admin</Link> : null}</div> : null}
      </section>
      <section className="rounded-lg border border-[#e7e5dc] bg-white p-6 md:p-8">
        <h2 className="text-2xl font-semibold tracking-[-0.035em] text-[#171717]">내 게시 요청</h2>
        <div className="mt-5 divide-y divide-[#e7e5dc]">
          {requests?.length ? requests.map((request) => (
            <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div><p className="font-medium text-[#171717]">{request.title}</p><p className="text-sm text-[#6b7280]">{request.type} · {new Date(request.created_at).toLocaleDateString("ko-KR")}</p></div>
              <StatusPill>{request.status}</StatusPill>
            </div>
          )) : <p className="py-4 text-sm text-[#6b7280]">아직 게시 요청이 없습니다.</p>}
        </div>
      </section>
    </div>
  );
}
