import { cronAuthorized } from "@/lib/cronAuth";
import { ensureCrews, runResearchDue, storageReady } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Daily: run the Brand Developers and Compliance Researchers that are due (?force=1 runs them all now). */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  if (!storageReady()) return Response.json({ error: "Storage isn't set up." }, { status: 500 });
  await ensureCrews();
  const force = new URL(request.url).searchParams.get("force") === "1";
  return Response.json(await runResearchDue(force));
}
