import { EmptyState } from "@/components/empty-state";
import { StatusPill } from "@/components/status-pill";
import { SubmitButton } from "@/components/submit-button";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { updateMemberRole } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminMembersPage() {
  await requireAdmin();
  const supabase = await createClient();
  const { data: roles } = await supabase
    .from("member_roles")
    .select("user_id, role, created_at, profiles(display_name, slug)")
    .order("created_at", { ascending: false });

  return (
    <div className="rounded-[2rem] border border-[#e7e2d8] bg-white p-8 shadow-sm">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3b5bdb]">Admin</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#111827]">멤버 승인</h1>
      <div className="mt-8 divide-y divide-[#e7e2d8]">
        {roles?.length ? roles.map((row) => {
          const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles;
          return (
            <div key={row.user_id} className="grid gap-4 py-5 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="font-medium text-[#111827]">{profile?.display_name ?? row.user_id}</p>
                <p className="text-sm text-[#6b7280]">{profile?.slug ?? row.user_id}</p>
                <div className="mt-2"><StatusPill>{row.role}</StatusPill></div>
              </div>
              <form action={updateMemberRole} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="user_id" value={row.user_id} />
                <select name="role" defaultValue={row.role} className="w-40"><option value="pending">pending</option><option value="member">member</option><option value="admin">admin</option></select>
                <SubmitButton pendingText="저장 중...">저장</SubmitButton>
              </form>
            </div>
          );
        }) : <EmptyState title="가입한 사용자가 없습니다" description="사용자가 로그인하면 pending 역할로 표시됩니다." />}
      </div>
    </div>
  );
}
