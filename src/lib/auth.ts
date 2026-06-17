import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MemberRole = "pending" | "member" | "admin";

export type AuthContext = {
  user: { id: string; email?: string };
  role: MemberRole;
  profile: {
    id: string;
    display_name: string | null;
    slug: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
};

export async function getAuthContext(): Promise<AuthContext | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;

  if (!user) return null;

  const [{ data: roleRow }, { data: profile }] = await Promise.all([
    supabase.from("member_roles").select("role").eq("user_id", user.id).maybeSingle(),
    supabase.from("profiles").select("id, display_name, slug, avatar_url, bio").eq("id", user.id).maybeSingle(),
  ]);

  const role = (roleRow?.role ?? "pending") as MemberRole;

  return {
    user: { id: user.id, email: user.email ?? undefined },
    role,
    profile,
  };
}

export async function requireMember() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "member" && context.role !== "admin") redirect("/dashboard?status=pending");
  return context;
}

export async function requireAdmin() {
  const context = await getAuthContext();
  if (!context) redirect("/login");
  if (context.role !== "admin") redirect("/dashboard?status=admin-required");
  return context;
}
