import { after } from "next/server";
import { verifyWebhook } from "@/lib/stripe";
import { getOrder, saveOrder, log } from "@/lib/orders";
import { runPipeline } from "@/lib/agent";
import { sendMail, siteUrl, STUDIO_INBOX } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get("stripe-signature"))) return new Response("Bad signature", { status: 400 });
  const event = JSON.parse(raw);
  if (event.type !== "checkout.session.completed") return Response.json({ received: true });

  const session = event.data?.object ?? {};
  const orderId = session.metadata?.orderId || session.client_reference_id;
  if (session.payment_status !== "paid" || !orderId) return Response.json({ received: true });

  const order = await getOrder(orderId);
  if (!order) return Response.json({ received: true });
  if (!order.paid) {
    order.paid = true;
    order.paidVia = "Stripe";
    order.status = "queued";
    log(order, "Paid by card (Stripe)");
    await saveOrder(order);
    await sendMail({
      to: order.customer.email,
      replyTo: STUDIO_INBOX,
      subject: "Payment received: we're building your brand",
      text: `Hi ${order.customer.name},\n\nThanks, your payment went through. Our agent is building your brand now, and a person on our team reviews everything before it comes to you. Expect it within 72 hours.\n\nCheck your order any time:\n${siteUrl()}/order/${order.id}?t=${order.token}\n\nCyberAdSpace\n${STUDIO_INBOX}`,
    });
    after(() => runPipeline(order.id));
  }
  return Response.json({ received: true });
}
