import { after } from "next/server";
import { ensureCrews } from "@/lib/crews";
import { isAdmin } from "@/lib/admin";
import { getOrder, saveOrder, log, listOrders, slugify, STEP_KEYS, DEPENDENTS, STEP_LABELS, out, MAX_REVISIONS, type StepKey, type NamesOut } from "@/lib/orders";
import { runPipeline, queueRedo } from "@/lib/agent";
import { sendMail, siteUrl, STUDIO_INBOX } from "@/lib/mail";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const back = new URL(`/admin/orders/${id}`, req.url);
  if (!(await isAdmin())) return Response.redirect(new URL("/admin", req.url), 303);
  const order = await getOrder(id);
  if (!order) return Response.redirect(new URL("/admin", req.url), 303);

  const form = await req.formData();
  const action = String(form.get("action") ?? "");
  const note = String(form.get("note") ?? "").trim().slice(0, 1000) || undefined;

  switch (action) {
    case "start": {
      if (!order.paid) {
        order.paid = true;
        order.paidVia = String(form.get("paidVia") ?? "").trim().slice(0, 60) || "Manual";
        log(order, `Marked paid (${order.paidVia})`);
      }
      order.status = "queued";
      await saveOrder(order);
      after(() => runPipeline(order.id));
      break;
    }
    case "resume": {
      order.status = "queued";
      order.updatedAt = new Date(0).toISOString(); // clear the "already running" guard
      await saveOrder(order);
      after(() => runPipeline(order.id));
      break;
    }
    case "redo": {
      const step = String(form.get("step")) as StepKey;
      if (!STEP_KEYS.includes(step)) break;
      queueRedo(order, step, note, DEPENDENTS[step]);
      log(order, `Sent back: ${STEP_LABELS[step]}`, note);
      order.status = "queued";
      await saveOrder(order);
      after(() => runPipeline(order.id));
      break;
    }
    case "select_name": {
      const names = out<NamesOut>(order, "names");
      const pick = String(form.get("name") ?? "");
      if (!names || !names.options.some((o) => o.name === pick)) break;
      names.selected = pick;
      order.slug = undefined;
      queueRedo(order, "kit", undefined, DEPENDENTS.kit);
      // The slug follows the chosen name; names step stays done.
      const taken = new Set((await listOrders()).filter((x) => x.id !== order.id).map((x) => x.slug));
      let s = slugify(pick) || "brand", n = 2;
      while (taken.has(s)) s = `${slugify(pick)}-${n++}`;
      order.slug = s;
      log(order, `Name chosen: ${pick}`);
      order.status = "queued";
      await saveOrder(order);
      after(() => runPipeline(order.id));
      break;
    }
    case "approve": {
      if (STEP_KEYS.some((k) => order.steps[k].status !== "done")) break;
      const firstDelivery = !order.history.some((h) => h.event === "Delivered to customer");
      order.status = "delivered";
      log(order, "Delivered to customer", note);
      await saveOrder(order);
      after(() => ensureCrews().then(() => undefined)); // the new brand gets its own agent crew
      const name = out<NamesOut>(order, "names")?.selected ?? "your brand";
      const base = siteUrl();
      const left = MAX_REVISIONS - order.revisionsUsed;
      await sendMail({
        to: order.customer.email,
        replyTo: STUDIO_INBOX,
        subject: firstDelivery ? `Your brand is ready: ${name}` : `Your revised brand is ready: ${name}`,
        text: `Hi ${order.customer.name},\n\n${firstDelivery ? `${name} is ready.` : `Your changes to ${name} are done.`}\n\nYour one-page website:\n${base}/b/${order.slug}\n\nYour order page (logo downloads, brand kit, launch posts, and change requests):\n${base}/order/${order.id}?t=${order.token}\n\nYou have ${left} revision round${left === 1 ? "" : "s"} left.${note ? `\n\nA note from us: ${note}` : ""}\n\nA heads-up: the name check we ran is a basic search, not legal clearance. Before you invest heavily in the name, consider a trademark attorney's search.\n\nCyberAdSpace\n${STUDIO_INBOX}`,
      });
      break;
    }
  }
  return Response.redirect(back, 303);
}
