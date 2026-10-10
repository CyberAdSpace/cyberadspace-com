import { cronAuthorized } from "@/lib/cronAuth";
import { ensureCrews, runAgent } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Re-run specific agents now: {"items":[{"slug","agent"}]}. Requires the CRON_SECRET bearer token. */
export async function POST(request: Request) {
  if (!cronAuthorized(request)) return Response.json({ error: "Not allowed." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const items: { slug: string; agent: string }[] = Array.isArray(body?.items) ? body.items.slice(0, 20) : [];
  await ensureCrews();
  const results: { slug: string; agent: string; title?: string }[] = [];
  // projects in parallel, each project's agents in order
  const byProject = new Map<string, string[]>();
  for (const it of items) byProject.set(String(it.slug), [...(byProject.get(String(it.slug)) ?? []), String(it.agent)]);
  await Promise.all([...byProject.entries()].map(async ([slug, agents]) => {
    for (const agent of agents) { const o = await runAgent(slug, agent); results.push({ slug, agent, title: o?.title }); }
  }));
  return Response.json({ results });
}
