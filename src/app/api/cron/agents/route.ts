import { ensureCrews, runDue, storageReady } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily: give any new project its crew, then run every agent that's due. Called by Vercel Cron. */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "Not allowed." }, { status: 401 });
  if (!storageReady()) return Response.json({ error: "Storage isn't set up." }, { status: 500 });
  const crews = await ensureCrews();
  const run = await runDue();
  return Response.json({ crews, run });
}
