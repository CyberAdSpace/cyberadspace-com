import { ADMIN_COOKIE, adminConfigured, adminCookieValue, checkPassword } from "@/lib/admin";

export const runtime = "nodejs";

const attempts = new Map<string, number[]>();

export async function POST(req: Request) {
  const form = await req.formData();
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const now = Date.now();
  const recent = (attempts.get(ip) ?? []).filter((t) => now - t < 15 * 60_000);
  recent.push(now);
  attempts.set(ip, recent);
  const back = new URL("/admin", req.url);

  if (form.get("logout")) {
    const headers = new Headers({ Location: back.toString() });
    headers.append("Set-Cookie", `${ADMIN_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 303, headers });
  }
  if (!adminConfigured() || recent.length > 10 || !checkPassword(String(form.get("password") ?? ""))) {
    back.searchParams.set("error", "1");
    return Response.redirect(back, 303);
  }
  const headers = new Headers({ Location: back.toString() });
  headers.append("Set-Cookie", `${ADMIN_COOKIE}=${adminCookieValue()}; Path=/; Max-Age=${60 * 60 * 24 * 14}; HttpOnly; Secure; SameSite=Lax`);
  return new Response(null, { status: 303, headers });
}
