import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const adminCookieName = "camp_admin";
const sessionValue = "admin";

function adminPassword() {
  return process.env.ADMIN_PASSWORD;
}

function signingSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? adminPassword();
}

function sign(value: string) {
  const secret = signingSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(value).digest("hex");
}

function signedCookieValue() {
  const signature = sign(sessionValue);
  return signature ? `${sessionValue}.${signature}` : "";
}

export function isPasswordAdminEnabled() {
  return Boolean(adminPassword() && signingSecret());
}

export async function hasAdminCookie() {
  const cookieStore = await cookies();
  const value = cookieStore.get(adminCookieName)?.value;
  const expected = signedCookieValue();
  if (!value || !expected) return false;

  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function createAdminSession(inputPassword: string) {
  const expectedPassword = adminPassword();
  if (!expectedPassword) return { ok: false as const, reason: "not-configured" as const };

  const inputBuffer = Buffer.from(inputPassword);
  const expectedBuffer = Buffer.from(expectedPassword);
  const passwordMatches = inputBuffer.length === expectedBuffer.length && timingSafeEqual(inputBuffer, expectedBuffer);
  if (!passwordMatches) return { ok: false as const, reason: "password" as const };

  const cookieStore = await cookies();
  cookieStore.set(adminCookieName, signedCookieValue(), {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return { ok: true as const };
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(adminCookieName);
}
