// Minimal Stripe Checkout + webhook verification without the SDK.
import crypto from "node:crypto";

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export async function createCheckout(opts: { orderId: string; email: string; amountUsd: number; successUrl: string; cancelUrl: string }) {
  const form = new URLSearchParams({
    mode: "payment",
    customer_email: opts.email,
    client_reference_id: opts.orderId,
    "metadata[orderId]": opts.orderId,
    "payment_intent_data[metadata][orderId]": opts.orderId,
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": "usd",
    "line_items[0][price_data][unit_amount]": String(Math.round(opts.amountUsd * 100)),
    "line_items[0][price_data][product_data][name]": "CyberAdSpace Brand Starter",
    "line_items[0][price_data][product_data][description]": "Brand name, logo, brand kit, one-page website, marketplace storefront and launch kit. AI-assisted, human-reviewed.",
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error?.message || "Stripe checkout failed");
  return { id: json.id as string, url: json.url as string };
}

/** Verify a Stripe-Signature header (v1 scheme, 5-minute tolerance). */
export function verifyWebhook(rawBody: string, header: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2 && p[0] !== "v1"));
  const sigs = header.split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => s.length === expected.length && crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected)));
}
