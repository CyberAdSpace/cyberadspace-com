import { CAS_SLUG, ensureCrews, runAgent, runDue, runResearchDue, storageReady } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily: give any new project its crew, then run every agent that's due. Called by Vercel Cron. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  if (!storageReady()) return Response.json({ error: "Storage isn't set up." }, { status: 500 });
  const crews = await ensureCrews();
  // Mini Me goes first: reads yesterday's work and today's audit, then dispatches agents that run below
  const chief = await runAgent(CAS_SLUG, "chief").catch(() => null);
  // research agents (Brand Developer, Compliance Researcher) run alongside the writers; they skip anything not due
  const [run, research] = await Promise.all([runDue(), runResearchDue()]);
  return Response.json({ crews, chief: chief?.title, run, research });
}
