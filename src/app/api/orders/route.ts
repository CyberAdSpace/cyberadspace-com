import { blobConfigured, newOrder, saveOrder, PRICE_USD, type Intake, type Product } from "@/lib/orders";
import { createCheckout, stripeConfigured } from "@/lib/stripe";
import { sendMail, siteUrl, STUDIO_INBOX } from "@/lib/mail";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/;
const STYLE_WORDS = ["Bold", "Calm", "Playful", "Luxury", "Earthy", "Techy", "Faith-based", "Vintage", "Modern", "Warm", "Minimal", "Bright"];
const clean = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);

const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 30 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 5;
}

export async function POST(req: Request) {
  let d: Record<string, unknown>;
  try { d = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  if (clean(d.website, 200)) return Response.json({ ok: true, next: "/start/thanks" }); // honeypot

  const name = clean(d.name, 100).replace(/\n/g, " ");
  const email = clean(d.email, 200);
  const products: Product[] = (Array.isArray(d.products) ? d.products : []).slice(0, 5).map((p: Record<string, unknown>) => ({
    name: clean(p?.name, 80), price: clean(p?.price, 30), details: clean(p?.details, 300),
  })).filter((p) => p.name);
  const intake: Intake = {
    idea: clean(d.idea, 900),
    audience: clean(d.audience, 500),
    products,
    style: (Array.isArray(d.style) ? d.style : []).map((s) => clean(s, 30)).filter((s) => STYLE_WORDS.includes(s)).slice(0, 3),
    colorsLike: clean(d.colorsLike, 200),
    colorsAvoid: clean(d.colorsAvoid, 200),
    nameIdeas: clean(d.nameIdeas, 300),
    admire: clean(d.admire, 300),
    languages: clean(d.languages, 100) || "English",
    ownDomain: clean(d.ownDomain, 100),
  };

  if (!name || !EMAIL_RE.test(email) || intake.idea.length < 20 || intake.audience.length < 5) {
    return Response.json({ ok: false, error: "Please add your name, a valid email, your idea (a sentence or two) and who it's for." }, { status: 400 });
  }
  if (d.agree !== true) return Response.json({ ok: false, error: "Please check the agreement box." }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return Response.json({ ok: false, error: "Too many submissions. Please try again later or email Contact@CyberAdSpace.com." }, { status: 429 });

  if (!blobConfigured()) {
    console.error("orders: BLOB_READ_WRITE_TOKEN not configured");
    return Response.json({ ok: false, error: "Orders are temporarily unavailable. Please email Contact@CyberAdSpace.com." }, { status: 503 });
  }

  const order = newOrder({ name, email }, intake);
  const base = siteUrl();
  const orderPage = `${base}/order/${order.id}?t=${order.token}`;

  if (stripeConfigured()) {
    try {
      const session = await createCheckout({
        orderId: order.id, email, amountUsd: PRICE_USD,
        successUrl: `${base}/start/thanks?id=${order.id}&t=${order.token}`,
        cancelUrl: `${base}/start?canceled=1`,
      });
      order.stripeSessionId = session.id;
      await saveOrder(order);
      return Response.json({ ok: true, checkoutUrl: session.url });
    } catch (err) {
      console.error("orders: stripe failed", err);
      return Response.json({ ok: false, error: "We couldn't start checkout. Please try again or email Contact@CyberAdSpace.com." }, { status: 502 });
    }
  }

  // No card checkout yet: save the order and arrange payment by email.
  await saveOrder(order);
  await Promise.all([
    sendMail({ to: STUDIO_INBOX, replyTo: email, subject: `New brand order (awaiting payment): ${name}`, text: `${name} <${email}> submitted a Brand Starter order.\n\nIdea: ${intake.idea}\n\nArrange payment, then start it here: ${base}/admin/orders/${order.id}` }),
    sendMail({ to: email, subject: "We got your brand order", text: `Hi ${name},\n\nThanks for your Brand Starter order with CyberAdSpace. We'll email you shortly with how to pay the $${PRICE_USD}. As soon as payment is in, we start building your brand.\n\nYou can check your order any time here:\n${orderPage}\n\nCyberAdSpace\n${STUDIO_INBOX}` }),
  ]);
  return Response.json({ ok: true, next: `/start/thanks?id=${order.id}&t=${order.token}` });
}
