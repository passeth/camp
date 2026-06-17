"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateMemberRole(formData: FormData) {
  const context = await requireAdmin();
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!userId || !["pending", "member", "admin"].includes(role)) {
    redirect("/admin/members?error=invalid-role");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("member_roles")
    .update({
      role,
      approved_by: role === "pending" ? null : context.user.id,
      approved_at: role === "pending" ? null : new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) redirect("/admin/members?error=update-failed");
  redirect("/admin/members?status=updated");
}
