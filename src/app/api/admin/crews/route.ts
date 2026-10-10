import { after } from "next/server";
import { isAdmin } from "@/lib/admin";
import { ensureCrews, reviewOutput, runAgent, runDue, runResearchDue, saveOwnerNotes, setAutopilot, CAS_SLUG } from "@/lib/crews";
import { askCounsel } from "@/lib/counsel";

export const maxDuration = 300;

export async function POST(req: Request) {
  const back = new URL("/admin/crews", req.url);
  if (!(await isAdmin())) return Response.redirect(new URL("/admin", req.url), 303);
  const f = await req.formData();
  const action = String(f.get("action") || "");
  const slug = String(f.get("slug") || "");
  if (action === "ensure") {
    const r = await ensureCrews();
    back.searchParams.set("msg", r.created.length ? `Created crews for ${r.created.length} project${r.created.length === 1 ? "" : "s"}.` : `All ${r.total} projects already have crews.`);
  } else if (action === "run-all") {
    after(async () => { await ensureCrews(); await runDue(); });
    back.searchParams.set("msg", "Agents are running. Refresh in a minute to see their work.");
  } else if (action === "run-one" && slug) {
    after(() => runAgent(slug, String(f.get("agent") || "")).then(() => undefined));
    back.searchParams.set("msg", "That agent is running. Refresh in a minute.");
  } else if (action === "run-research") {
    after(async () => { await ensureCrews(); await runResearchDue(true); });
    back.searchParams.set("msg", "Brand Developers and Compliance Researchers are researching. It takes a few minutes; you'll get an email when they finish.");
  } else if (action === "notes" && slug) {
    await saveOwnerNotes(slug, String(f.get("notes") || ""));
    back.searchParams.set("msg", "Saved. The Brand Developer and every writer for that brand will use your answers from now on.");
  } else if (action === "ask-counsel") {
    const q = String(f.get("question") || "").trim();
    if (q) { await askCounsel(q); after(() => runAgent(CAS_SLUG, "counsel").then(() => undefined)); }
    back.searchParams.set("msg", "AI Counsel is researching your question. The answer will show here and arrive by email in a few minutes.");
  } else if (action === "autopilot-on" || action === "autopilot-off") {
    await setAutopilot(action === "autopilot-on");
    back.searchParams.set("msg", action === "autopilot-on" ? "Autopilot on: Mini Me publishes or rejects drafts itself." : "Autopilot off: drafts wait for you.");
  } else if ((action === "approve" || action === "reject") && slug) {
    await reviewOutput(slug, String(f.get("output") || ""), action === "approve" ? "approved" : "rejected");
  }
  return Response.redirect(back, 303);
}
