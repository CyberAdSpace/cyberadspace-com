import { cronAuthorized } from "@/lib/cronAuth";
import { CAS_SLUG, ensureCrews, runAgent, storageReady } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily: the CAS Security Auditor checks every site. Called by Vercel Cron (or the review tools) with the CRON_SECRET. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  if (!storageReady()) return Response.json({ error: "Storage isn't set up." }, { status: 500 });
  await ensureCrews();
  const o = await runAgent(CAS_SLUG, "audit");
  return Response.json({ ok: Boolean(o), title: o?.title });
}
