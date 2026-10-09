import crypto from "node:crypto";
import { blobConfigured, getOrder, listOrders } from "@/lib/orders";
import { AGENTS, arcadeOrders, isLive, toArcade, type ArcadeFeed } from "@/lib/arcade";

export const dynamic = "force-dynamic";

/**
 * GET /api/arcade            public feed of recent paid builds (anonymized)
 * GET /api/arcade?order=ID&t=TOKEN   one customer's own build, with its brand name
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("order");
  const t = url.searchParams.get("t") ?? "";
  const now = new Date().toISOString();

  if (!blobConfigured()) {
    return Response.json({ now, live: false, agents: AGENTS, orders: [] } satisfies ArcadeFeed);
  }

  try {
    if (id) {
      const o = await getOrder(id);
      if (!o || t.length !== o.token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.token))) {
        return Response.json({ error: "Order not found." }, { status: 404 });
      }
      const orders = [toArcade(o, true)];
      return Response.json({ now, live: isLive(orders), agents: AGENTS, orders } satisfies ArcadeFeed, { headers: { "Cache-Control": "no-store" } });
    }
    const orders = arcadeOrders(await listOrders());
    return Response.json({ now, live: isLive(orders), agents: AGENTS, orders } satisfies ArcadeFeed, {
      headers: { "Cache-Control": "public, s-maxage=5, stale-while-revalidate=20" },
    });
  } catch {
    return Response.json({ now, live: false, agents: AGENTS, orders: [] } satisfies ArcadeFeed);
  }
}
