import Link from "next/link";
import { listOrders, blobConfigured, out, type Kit, type LogoOut, type NamesOut, type StorefrontOut } from "@/lib/orders";

export const revalidate = 300;
export const metadata = {
  title: "Marketplace | CyberAdSpace",
  description: "Brands created with CyberAdSpace and the products they offer.",
};

export default async function Marketplace() {
  const orders = blobConfigured() ? (await listOrders()).filter((o) => o.history.some((h) => h.event === "Delivered to customer") && o.slug) : [];
  return (
    <main id="main-content" className="site-shell section-space market-page">
      <div className="eyebrow">CyberAdSpace Marketplace</div>
      <h1 className="display start-title">Brands made here.<br /><span>Products worth a look.</span></h1>
      <p className="start-lede">Every brand on this page was created through CyberAdSpace. Online checkout is coming soon; for now, each brand page has a way to get in touch.</p>
      {orders.length === 0 ? (
        <p className="start-fine">The first customer brands are being built now. <Link href="/start">Launch yours for $350 ↗</Link></p>
      ) : (
        <div className="market-grid">
          {orders.map((o) => {
            const name = out<NamesOut>(o, "names")?.selected ?? "";
            const kit = out<Kit>(o, "kit");
            const logo = out<LogoOut>(o, "logo");
            const products = out<StorefrontOut>(o, "storefront")?.products ?? [];
            return (
              <Link key={o.id} href={`/b/${o.slug}`} className="market-card" style={{ "--m-accent": kit?.palette.primary } as React.CSSProperties}>
                {logo?.iconUrl ? <img src={logo.iconUrl} alt="" width={72} height={72} /> : <span className="bsite-mono">{name[0]}</span>}
                <h2>{name}</h2>
                <p>{kit?.tagline}</p>
                {products.length > 0 && <p className="muted">{products.length} product{products.length === 1 ? "" : "s"} · from {products.map((p) => p.price).filter(Boolean)[0] ?? "ask"}</p>}
              </Link>
            );
          })}
        </div>
      )}
      <p className="start-fine">Sellers pay a 3.5% fee on sales made through the Marketplace.</p>
    </main>
  );
}
