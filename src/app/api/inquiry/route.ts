import nodemailer from "nodemailer";

export const runtime = "nodejs";

const TO = "Contact@CyberAdSpace.com";
const SERVICES = ["Brand + website", "New brand or rebrand", "New website or redesign", "Let's explore my idea"];
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;

// Best-effort per-instance throttle: 5 submissions per IP per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

const clean = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);

export async function POST(req: Request) {
  let data: Record<string, unknown>;
  try { data = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid request." }, { status: 400 }); }

  // Honeypot: real visitors never fill this hidden field.
  if (clean(data.website, 200)) return Response.json({ ok: true });

  const name = clean(data.name, 100).replace(/\n/g, " ");
  const email = clean(data.email, 200);
  const service = clean(data.service, 60);
  const brief = clean(data.brief, 1800);

  if (!name || !EMAIL_RE.test(email) || !SERVICES.includes(service) || brief.length < 15) {
    return Response.json({ ok: false, error: "Please check your name, email, project type and description." }, { status: 400 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return Response.json({ ok: false, error: "Too many messages. Please try again later or email us directly." }, { status: 429 });

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    console.error("inquiry: SMTP_USER/SMTP_PASS not configured");
    return Response.json({ ok: false, error: "The form is temporarily unavailable. Please email Contact@CyberAdSpace.com." }, { status: 503 });
  }

  const transport = nodemailer.createTransport({ host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465), secure: Number(process.env.SMTP_PORT || 465) === 465, auth: { user, pass } });
  try {
    await transport.sendMail({
      from: `"CyberAdSpace Website" <${user}>`,
      to: TO,
      replyTo: { name, address: email },
      subject: `Project inquiry: ${service} from ${name}`,
      text: [`Name: ${name}`, `Email: ${email}`, `Project: ${service}`, "", brief, "", "Sent from the project form on cyberadspace.com. Reply to this email to answer the visitor."].join("\n"),
    });
  } catch (err) {
    console.error("inquiry: send failed", err);
    return Response.json({ ok: false, error: "We couldn't send your message. Please try again or email Contact@CyberAdSpace.com." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
