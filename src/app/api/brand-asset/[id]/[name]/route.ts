import { getOrder, readAsset } from "@/lib/orders";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; name: string }> }) {
  const { id, name } = await params;
  const order = await getOrder(id);
  if (!order) return new Response("Not found", { status: 404 });
  const t = new URL(req.url).searchParams.get("t");
  const allowed = order.history.some((h) => h.event === "Delivered to customer") || t === order.token || (await isAdmin());
  if (!allowed) return new Response("Not found", { status: 404 });
  const blob = await readAsset(id, name);
  if (!blob) return new Response("Not found", { status: 404 });
  return new Response(blob.stream, {
    headers: {
      "Content-Type": blob.blob.contentType || "image/png",
      // File names are versioned (icon-<v>.png), so they never change once written.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
