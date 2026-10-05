import crypto from "node:crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cas_admin";

function sign() {
  const pw = process.env.ADMIN_PASSWORD || "";
  return crypto.createHmac("sha256", pw || "unset").update("cas-admin-v1").digest("hex");
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

export function checkPassword(input: string) {
  const pw = process.env.ADMIN_PASSWORD || "";
  if (!pw) return false;
  const a = Buffer.from(crypto.createHash("sha256").update(input).digest("hex"));
  const b = Buffer.from(crypto.createHash("sha256").update(pw).digest("hex"));
  return crypto.timingSafeEqual(a, b);
}

export function adminCookieValue() {
  return sign();
}

export async function isAdmin() {
  if (!adminConfigured()) return false;
  const jar = await cookies();
  const v = jar.get(ADMIN_COOKIE)?.value || "";
  const expected = sign();
  return v.length === expected.length && crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected));
}
