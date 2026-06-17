import { EmptyState } from "@/components/empty-state";
import { MarkdownView } from "@/components/markdown-view";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updatePublishRequestStatus } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminPublishRequestsPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: requests } = await supabase
    .from("publish_requests")
    .select("id, title, slug, type, category, tags, markdown, status, created_at, profiles:user_id(display_name, slug)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-[#e7e2d8] bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3b5bdb]">Admin</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#111827]">게시 요청 검토</h1>
      </section>
      {requests?.length ? requests.map((request) => {
        const profile = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
        return (
          <section key={request.id} className="space-y-5 rounded-[2rem] border border-[#e7e2d8] bg-white p-8 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex flex-wrap gap-2"><StatusPill>{request.status}</StatusPill><StatusPill>{request.type}</StatusPill></div>
                <h2 className="text-3xl font-semibold tracking-[-0.03em] text-[#111827]">{request.title}</h2>
                <p className="mt-2 text-sm text-[#6b7280]">/{request.slug} · {profile?.display_name ?? "unknown"}</p>
              </div>
              <form action={updatePublishRequestStatus} className="grid gap-2 sm:min-w-72">
                <input type="hidden" name="id" value={request.id} />
                <select name="status" defaultValue={request.status}><option value="approved">approve</option><option value="rejected">reject</option><option value="published">mark published</option></select>
                <input name="reviewer_note" placeholder="검토 메모" />
                <SubmitButton pendingText="저장 중...">상태 저장</SubmitButton>
              </form>
            </div>
            <MarkdownView content={request.markdown} />
          </section>
        );
      }) : <EmptyState title="게시 요청이 없습니다" description="멤버가 /write에서 제출하면 이곳에 표시됩니다." />}
    </div>
  );
}
