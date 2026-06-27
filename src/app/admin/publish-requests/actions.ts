"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updatePublishRequestStatus(formData: FormData) {
  const context = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  const reviewerNote = String(formData.get("reviewer_note") ?? "").trim() || null;

  if (!id || !["approved", "rejected", "published"].includes(status)) {
    redirect("/admin/publish-requests?error=invalid-request");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("publish_requests")
    .update({
      status,
      reviewer_id: context?.user.id ?? null,
      reviewer_note: reviewerNote,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) redirect("/admin/publish-requests?error=update-failed");
  redirect("/admin/publish-requests?status=updated");
}
