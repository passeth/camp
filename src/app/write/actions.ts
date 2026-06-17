"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const publishRequestSchema = z.object({
  title: z.string().min(2).max(120),
  slug: z.string().min(2).max(160).regex(/^[a-z0-9]+(?:[/-][a-z0-9]+)*$/),
  type: z.enum(["press", "topic", "daily-review", "study-log", "teach"]),
  category: z.string().max(80).optional(),
  tags: z.string().optional(),
  markdown: z.string().min(20).max(50000),
});

export async function createPublishRequest(formData: FormData) {
  const context = await requireMember();
  const parsed = publishRequestSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    type: formData.get("type"),
    category: formData.get("category") || undefined,
    tags: formData.get("tags") || undefined,
    markdown: formData.get("markdown"),
  });

  if (!parsed.success) redirect("/write?error=invalid-input");

  const supabase = await createClient();
  const { tags, ...values } = parsed.data;
  const { error } = await supabase.from("publish_requests").insert({
    ...values,
    user_id: context.user.id,
    tags: tags?.split(",").map((tag) => tag.trim()).filter(Boolean) ?? [],
    status: "submitted",
  });

  if (error) redirect("/write?error=submit-failed");
  redirect("/dashboard?status=publish-request-submitted");
}
