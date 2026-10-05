import { after } from "next/server";
import crypto from "node:crypto";
import { getOrder, saveOrder, log, STEP_KEYS, STEP_LABELS, MAX_REVISIONS, type StepKey } from "@/lib/orders";
import { queueRedo, runPipeline } from "@/lib/agent";
import { sendMail, siteUrl, STUDIO_INBOX } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 300;

// Sections a customer can ask to change. Names/brief changes go through the studio by email.
const CUSTOMER_STEPS: StepKey[] = ["kit", "logo", "site", "storefront", "launch"];

function tokenOk(a: string, b: string) {
  return a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const form = await req.formData();
  const t = String(form.get("t") ?? "");
  const order = await getOrder(id);
  if (!order || !tokenOk(t, order.token)) return new Response("Not found", { status: 404 });
  const back = new URL(`/order/${id}`, req.url);
  back.searchParams.set("t", t);

  const sections = form.getAll("section").map(String).filter((s): s is StepKey => (CUSTOMER_STEPS as string[]).includes(s));
  const note = String(form.get("note") ?? "").trim().slice(0, 1500);
  if (order.status !== "delivered" || order.revisionsUsed >= MAX_REVISIONS || !sections.length || note.length < 5) {
    back.searchParams.set("revision", "invalid");
    return Response.redirect(back, 303);
  }

  order.revisionsUsed += 1;
  // Redo the earliest chosen section; later customer sections are redone with the same note.
  const ordered = STEP_KEYS.filter((k) => sections.includes(k));
  for (const k of ordered) queueRedo(order, k, note, []);
  order.status = "revision_requested";
  log(order, `Customer revision ${order.revisionsUsed}/${MAX_REVISIONS}: ${ordered.map((k) => STEP_LABELS[k]).join(", ")}`, note);
  await saveOrder(order);
  await sendMail({ to: STUDIO_INBOX, replyTo: order.customer.email, subject: `Revision request (${order.revisionsUsed}/${MAX_REVISIONS}) on brand order ${order.id}`, text: `${order.customer.name} asked for changes to: ${ordered.map((k) => STEP_LABELS[k]).join(", ")}\n\n"${note}"\n\nThe agent is redoing those parts now. You'll get a review alert when it's ready: ${siteUrl()}/admin/orders/${order.id}` });
  after(() => runPipeline(order.id));
  back.searchParams.set("revision", "sent");
  return Response.redirect(back, 303);
}
