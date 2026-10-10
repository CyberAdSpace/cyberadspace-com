import { cronAuthorized } from "@/lib/cronAuth";
import { latestAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

/** The latest full audit report, only for Cyber Ad Space's own tools (CRON_SECRET bearer token). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  const r = await latestAudit();
  if (!r) return Response.json({ error: "No audit yet." }, { status: 404 });
  return Response.json({ at: r.at, summary: r.summary, sites: r.sites.map((s) => ({ name: s.name, grade: s.grade, issues: s.checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => `${c.status.toUpperCase()} ${c.label}: ${c.detail}`) })) }, { headers: { "Cache-Control": "no-store" } });
}
