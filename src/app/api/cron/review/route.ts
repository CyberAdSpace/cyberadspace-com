import { cronAuthorized } from "@/lib/cronAuth";
import { reviewOutput } from "@/lib/crews";

export const dynamic = "force-dynamic";

/** Approve or reject drafts in bulk: {"items":[{"slug","output","decision":"approved"|"rejected"}]}. Requires the CRON_SECRET bearer token. */
export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const items: { slug: string; output: string; decision: string }[] = Array.isArray(body?.items) ? body.items : [];
  let done = 0;
  for (const it of items) {
    if (it.decision !== "approved" && it.decision !== "rejected") continue;
    await reviewOutput(String(it.slug), String(it.output), it.decision);
    done++;
  }
  return Response.json({ done });
}
