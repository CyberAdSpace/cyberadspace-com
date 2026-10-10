// Brand chat agents. The brand comes from the page's Origin (see src/lib/chat.ts).
// GET  /api/chat?brand=<slug>  -> { name, accent, greeting, contact, url }
// POST /api/chat { brand, messages: [{ role, content }] } -> { reply }
import { answer, chatBrand, cleanMessages, greeting, originAllowed, resolveBrand } from "@/lib/chat";

export const runtime = "nodejs";
export const maxDuration = 60;

function cors(origin: string | null) {
  const h = new Headers({ Vary: "Origin", "Cache-Control": "no-store" });
  if (originAllowed(origin)) {
    h.set("Access-Control-Allow-Origin", origin!);
    h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}

const reply = (origin: string | null, body: object, status = 200) => Response.json(body, { status, headers: cors(origin) });

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function GET(req: Request) {
  const origin = req.headers.get("origin");
  const slug = new URL(req.url).searchParams.get("brand") ?? "";
  // Public facts only; the brand's own name, color and greeting. Cross-origin reads still need an allowed Origin.
  const b = origin ? resolveBrand(origin, slug) : chatBrand(slug);
  if (!b) return reply(origin, { error: "Unknown brand." }, origin && !originAllowed(origin) ? 403 : 404);
  return reply(origin, { name: b.name, accent: b.accent, greeting: greeting(b), contact: b.contact, url: b.url });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  if (!originAllowed(origin)) return reply(origin, { error: "This site can't use the chat." }, 403);

  let data: { brand?: unknown; messages?: unknown };
  try {
    data = await req.json();
  } catch {
    return reply(origin, { error: "Invalid request." }, 400);
  }
  const b = resolveBrand(origin, String(data.brand ?? "").slice(0, 60));
  if (!b) return reply(origin, { error: "Unknown brand." }, 403);
  const messages = cleanMessages(data.messages);
  if (!messages) return reply(origin, { error: "Please type a question." }, 400);

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  const out = await answer(b, messages, ip);
  return reply(origin, out, out.limited ? 429 : 200);
}
