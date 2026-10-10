import { after } from "next/server";
import { isAdmin } from "@/lib/admin";
import { ensureCrews, reviewOutput, runAgent, runDue } from "@/lib/crews";

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
  } else if ((action === "approve" || action === "reject") && slug) {
    await reviewOutput(slug, String(f.get("output") || ""), action === "approve" ? "approved" : "rejected");
  }
  return Response.redirect(back, 303);
}
