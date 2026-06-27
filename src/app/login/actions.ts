"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearAdminSession, createAdminSession } from "@/lib/admin-session";
import { createClient } from "@/lib/supabase/server";


export async function signInWithPassword(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=password-required");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect("/login?error=password-signin-failed");
  redirect("/dashboard");
}

export async function signInWithEmail(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login?error=email-required");

  const headerStore = await headers();
  const origin = headerStore.get("origin") ?? "http://localhost:3000";
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/dashboard` },
  });

  if (error) redirect("/login?error=signin-failed");
  redirect("/login?status=check-email");
}

export async function signOut() {
  await clearAdminSession();
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInAsAdmin(formData: FormData) {
  const password = String(formData.get("adminPassword") ?? "");
  if (!password) redirect("/login?error=admin-password-required");

  const result = await createAdminSession(password);
  if (!result.ok) {
    redirect(result.reason === "not-configured" ? "/login?error=admin-not-configured" : "/login?error=admin-password-failed");
  }

  redirect("/admin");
}
