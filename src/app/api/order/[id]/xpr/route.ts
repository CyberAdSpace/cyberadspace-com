import { after } from "next/server";
import crypto from "node:crypto";
import { getOrder, saveOrder, log, PRICE_USD } from "@/lib/orders";
import { runPipeline } from "@/lib/agent";
import { sendMail, siteUrl, STUDIO_INBOX } from "@/lib/mail";
import { verifyXmdPayment, xprConfigured, explorerTx } from "@/lib/xpr";

export const runtime = "nodejs";
export const maxDuration = 300;

// The customer's browser posts the WebAuth transaction id here after paying.
// We only mark the order paid after confirming the transfer on-chain.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!xprConfigured()) return Response.json({ ok: false, error: "Wallet payments aren't turned on." }, { status: 503 });
  const { id } = await params;
  let body: { t?: string; txId?: string };
  try { body = await req.json(); } catch { return Response.json({ ok: false, error: "Invalid request." }, { status: 400 }); }
  const t = String(body.t ?? ""); const txId = String(body.txId ?? "").toLowerCase().trim();

  const order = await getOrder(id);
  if (!order || t.length !== order.token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(order.token))) {
    return Response.json({ ok: false, error: "Order not found." }, { status: 404 });
  }
  if (order.paid) return Response.json({ ok: true, status: "paid" });
  if (!/^[0-9a-f]{64}$/.test(txId)) return Response.json({ ok: false, error: "That transaction id doesn't look right." }, { status: 400 });

  const verdict = await verifyXmdPayment(txId, order.id, PRICE_USD);
  if (verdict.ok) {
    order.paid = true;
    order.paidVia = "XPR WebAuth (XMD)";
    order.xprTx = txId;
    order.status = "queued";
    log(order, "Paid with WebAuth wallet (XMD)", txId);
    await saveOrder(order);
    await Promise.all([
      sendMail({
        to: order.customer.email, replyTo: STUDIO_INBOX,
        subject: "Payment received: we're building your brand",
        text: `Hi ${order.customer.name},\n\nThanks, your WebAuth payment came through. Our agent is building your brand now, and a person on our team reviews everything before it comes to you. Expect it within 72 hours.\n\nCheck your order any time:\n${siteUrl()}/order/${order.id}?t=${order.token}\n\nCyberAdSpace\n${STUDIO_INBOX}`,
      }),
      sendMail({ to: STUDIO_INBOX, subject: `XMD payment confirmed: order ${order.id}`, text: `Order ${order.id} paid ${PRICE_USD} XMD via WebAuth.\nTransaction: ${explorerTx(txId)}` }),
    ]);
    after(() => runPipeline(order.id));
    return Response.json({ ok: true, status: "paid" });
  }

  if (verdict.reason === "mismatch") {
    return Response.json({ ok: false, error: "We found that transaction, but it doesn't match this order (amount, account or memo). Email us and we'll sort it out." }, { status: 400 });
  }

  // Not indexed yet, or the history service is unreachable: record it and let a person confirm.
  if (order.xprTx !== txId) {
    order.xprTx = txId;
    log(order, "WebAuth payment submitted, awaiting confirmation", txId);
    await saveOrder(order);
    await sendMail({ to: STUDIO_INBOX, subject: `Check XMD payment: order ${order.id}`, text: `A customer submitted a WebAuth payment we couldn't confirm automatically yet.\n\nOrder: ${siteUrl()}/admin/orders/${order.id}\nTransaction: ${explorerTx(txId)}\n\nIf it shows ${PRICE_USD} XMD to your account with memo ${order.id}, mark the order paid in the dashboard.` });
  }
  return Response.json({ ok: true, status: "pending" });
}
