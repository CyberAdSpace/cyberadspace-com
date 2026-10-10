import { cronAuthorized } from "@/lib/cronAuth";
import { pendingDrafts } from "@/lib/crews";

export const dynamic = "force-dynamic";

/** Read-only list of drafts awaiting review. Requires the CRON_SECRET bearer token. */
export async function GET(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  return Response.json({ drafts: await pendingDrafts() }, { headers: { "Cache-Control": "no-store" } });
}
