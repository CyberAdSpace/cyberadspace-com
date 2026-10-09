// Shared contact/quote endpoint for every brand site.
// Each site's form posts here; the message goes to that brand's own inbox (see brand-inboxes.ts),
// sent through the CyberAdSpace mail account, and a copy is kept in the private Blob store under leads/.
import { put } from "@vercel/blob";
import { BRAND_INBOXES, inboxForOrigin } from "@/lib/brand-inboxes";
import { sendMail } from "@/lib/mail";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
const oneLine = (v: unknown, max: number) => clean(v, max).replace(/\s*\n\s*/g, " ");

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

function cors(origin: string | null) {
  const h = new Headers({ Vary: "Origin" });
  if (inboxForOrigin(origin)) {
    h.set("Access-Control-Allow-Origin", origin!);
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "Content-Type");
    h.set("Access-Control-Max-Age", "86400");
  }
  return h;
}

const reply = (origin: string | null, body: object, status = 200) => Response.json(body, { status, headers: cors(origin) });

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: cors(req.headers.get("origin")) });
}

export async function POST(req: Request) {
  const origin = req.headers.get("origin");
  let data: Record<string, unknown>;
  try {
    const type = req.headers.get("content-type") ?? "";
    data = type.includes("application/json") ? await req.json() : Object.fromEntries(await req.formData());
  } catch {
    return reply(origin, { ok: false, error: "Invalid request." }, 400);
  }

  // The site comes from the page's origin when there is one; `site` is only a fallback for same-origin tests.
  const match = inboxForOrigin(origin) ?? (origin ? null : (BRAND_INBOXES[clean(data.site, 40)] ? [clean(data.site, 40), BRAND_INBOXES[clean(data.site, 40)]] as const : null));
  if (!match) return reply(origin, { ok: false, error: "Unknown site." }, 403);
  const [siteKey, brand] = match;

  if (clean(data.website, 200) || clean(data["bot-field"], 200)) return reply(origin, { ok: true }); // honeypot

  const name = oneLine(data.name, 100);
  const email = oneLine(data.email, 200);
  const phone = oneLine(data.phone, 40);
  const topic = oneLine(data.topic, 80) || "General question";
  const message = clean(data.message, 3000);
  const consent = data.consent === true || data.consent === "on" || data.consent === "yes";

  // Optional extra fields a site may send (e.g. ZIP code, project type). Kept short and flat.
  const extras: [string, string][] = [];
  if (data.details && typeof data.details === "object") {
    for (const [k, v] of Object.entries(data.details as Record<string, unknown>).slice(0, 12)) {
      const key = oneLine(k, 40), val = oneLine(v, 300);
      if (key && val) extras.push([key, val]);
    }
  }

  if (!name || !EMAIL_RE.test(email) || message.length < 5) {
    return reply(origin, { ok: false, error: "Please add your name, a valid email and a short message." }, 400);
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return reply(origin, { ok: false, error: `Too many messages. Please try again later or email ${brand.to}.` }, 429);

  const receivedAt = new Date().toISOString();
  const lines = [
    `Site: ${brand.name}${origin ? ` (${origin})` : ""}`,
    `Topic: ${topic}`,
    `Name: ${name}`,
    `Email: ${email}`,
    ...(phone ? [`Phone: ${phone}`] : []),
    ...extras.map(([k, v]) => `${k}: ${v}`),
    ...(data.consent !== undefined ? [`Agreed to be contacted by a partner contractor: ${consent ? "Yes" : "No"}`] : []),
    "",
    message,
    "",
    `Received ${receivedAt}. Reply to this email to answer ${name} directly.`,
  ];

  const sent = await sendMail({ fromName: `${brand.name} Website`, to: brand.to, replyTo: `${name} <${email}>`, subject: `${brand.name}: ${topic} from ${name}`, text: lines.join("\n") });

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const id = `${receivedAt.replace(/[:.]/g, "-")}-${Math.random().toString(36).slice(2, 8)}`;
    await put(`leads/${siteKey}/${id}.json`, JSON.stringify({ site: siteKey, brand: brand.name, to: brand.to, origin, topic, name, email, phone, extras, consent, message, receivedAt, emailed: sent }), {
      access: "private", contentType: "application/json", addRandomSuffix: false,
    }).catch((err) => console.error("contact: lead not saved", err));
  }

  if (!sent) return reply(origin, { ok: false, error: `We couldn't send your message. Please email ${brand.to}.` }, 502);
  return reply(origin, { ok: true });
}
