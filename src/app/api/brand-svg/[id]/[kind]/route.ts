import { getOrder, readAsset, out, type Kit, type LogoOut, type NamesOut } from "@/lib/orders";
import { brandSvg, SVG_KINDS, type SvgKind } from "@/lib/brandsvg";
import { isAdmin } from "@/lib/admin";

export const runtime = "nodejs";

export async function GET(req: Request, { params }: { params: Promise<{ id: string; kind: string }> }) {
  const { id, kind: raw } = await params;
  const kind = raw.replace(/\.svg$/, "") as SvgKind;
  if (!SVG_KINDS.includes(kind)) return new Response("Not found", { status: 404 });
  const order = await getOrder(id);
  if (!order) return new Response("Not found", { status: 404 });
  const url = new URL(req.url);
  const allowed = order.history.some((h) => h.event === "Delivered to customer") || url.searchParams.get("t") === order.token || (await isAdmin());
  const kit = out<Kit>(order, "kit");
  const name = out<NamesOut>(order, "names")?.selected;
  if (!allowed || !kit || !name) return new Response("Not found", { status: 404 });

  let dataUri: string | null = null;
  const iconUrl = out<LogoOut>(order, "logo")?.iconUrl;
  const file = iconUrl?.split("/").pop();
  if (file) {
    const blob = await readAsset(order.id, file);
    if (blob) dataUri = `data:image/png;base64,${Buffer.from(await new Response(blob.stream).arrayBuffer()).toString("base64")}`;
  }
  const svg = brandSvg(kind, name, kit, dataUri, kind === "profile" ? undefined : kit.tagline);
  const download = url.searchParams.get("download") === "1";
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "private, max-age=60",
      ...(download ? { "Content-Disposition": `attachment; filename="${order.slug || "brand"}-${kind}.svg"` } : {}),
    },
  });
}
