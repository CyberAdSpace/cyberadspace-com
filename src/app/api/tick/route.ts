import { after } from "next/server";
import { storageReady } from "@/lib/crews";
import { engineState, tick } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Public heartbeat for the agent engine. Safe to call often: work is spaced (4 min) and budgeted per day. */
export async function GET(request: Request) {
  if (!storageReady()) return Response.json({ ok: false });
  const chain = new URL(request.url).searchParams.get("chain") === "1";
  after(() => tick(chain ? "chain" : "heartbeat").then(() => undefined).catch(() => undefined));
  const s = await engineState();
  return Response.json({ ok: true, lastTickAt: s.lastTickAt, jobsToday: s.aiJobs, lastJob: s.lastJob ? { at: s.lastJob.at, project: s.lastJob.project, agent: s.lastJob.agent } : null }, { headers: { "Cache-Control": "no-store" } });
}
