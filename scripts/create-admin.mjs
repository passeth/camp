import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(".env.local");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = process.env.ADMIN_EMAIL;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminDisplayName = process.env.ADMIN_DISPLAY_NAME ?? "Camp Admin";
const adminSlug = process.env.ADMIN_SLUG ?? "camp-admin";

const missing = Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  ADMIN_EMAIL: adminEmail,
  ADMIN_PASSWORD: adminPassword,
}).filter(([, value]) => !value);

if (missing.length > 0) {
  console.error(`Missing required env: ${missing.map(([key]) => key).join(", ")}`);
  console.error("Add them to .env.local. SUPABASE_SERVICE_ROLE_KEY is required to create or update auth users.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: created, error: createError } = await supabase.auth.admin.createUser({
  email: adminEmail,
  password: adminPassword,
  email_confirm: true,
  user_metadata: { display_name: adminDisplayName },
});

let user = created?.user;

if (createError) {
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  user = listData.users.find((candidate) => candidate.email?.toLowerCase() === adminEmail.toLowerCase());
  if (!user) throw createError;

  const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
    password: adminPassword,
    email_confirm: true,
    user_metadata: { display_name: adminDisplayName },
  });
  if (updateError) throw updateError;
  user = updated.user;
}

const { error: profileError } = await supabase.from("profiles").upsert({
  id: user.id,
  display_name: adminDisplayName,
  slug: adminSlug,
  bio: "Camp administrator",
});
if (profileError) throw profileError;

const { error: roleError } = await supabase.from("member_roles").upsert({
  user_id: user.id,
  role: "admin",
  approved_by: user.id,
  approved_at: new Date().toISOString(),
});
if (roleError) throw roleError;

console.log(`Admin user ready: ${adminEmail}`);
