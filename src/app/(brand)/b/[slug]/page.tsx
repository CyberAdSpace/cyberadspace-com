import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findBySlug, out, type Kit, type LogoOut, type NamesOut, type SiteOut, type StorefrontOut, type Order } from "@/lib/orders";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

const delivered = (o: Order) => o.history.some((h) => h.event === "Delivered to customer");

async function load(slug: string) {
  const order = await findBySlug(slug);
  if (!order) return null;
  const preview = !delivered(order);
  if (preview && !(await isAdmin())) return null;
  const name = out<NamesOut>(order, "names")?.selected;
  const kit = out<Kit>(order, "kit");
  const site = out<SiteOut>(order, "site");
  if (!name || !kit || !site) return null;
  return { order, preview, name, kit, site, logo: out<LogoOut>(order, "logo"), store: out<StorefrontOut>(order, "storefront") };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) return { title: "Not found" };
  return { title: `${d.name} · ${d.kit.tagline}`, description: d.site.heroSub, robots: d.preview ? { index: false } : undefined };
}

export default async function BrandPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await load(slug);
  if (!d) notFound();
  const { preview, name, kit, site, logo, store } = d;
  const p = kit.palette;
  const fonts = `https://fonts.googleapis.com/css2?${[kit.fonts.heading, kit.fonts.body].map((f) => `family=${f.replace(/ /g, "+")}:wght@400;600;700`).join("&")}&display=swap`;
  const vars = {
    "--b-primary": p.primary, "--b-secondary": p.secondary, "--b-accent": p.accent, "--b-bg": p.background, "--b-text": p.text,
    "--b-head": `'${kit.fonts.heading}', Georgia, serif`, "--b-body": `'${kit.fonts.body}', system-ui, sans-serif`,
  } as React.CSSProperties;
  const products = store?.products ?? [];
  const contact = `mailto:Contact@CyberAdSpace.com?subject=${encodeURIComponent(`Interested in ${name}`)}`;

  return (
    <div className="bsite" style={vars}>
      <link rel="stylesheet" href={fonts} precedence="default" />
      {preview && <div className="bsite-preview">Preview: only you can see this until the brand is approved and delivered.</div>}
      <header className="bsite-header">
        <div className="bsite-wrap bsite-brand">
          {logo?.iconUrl ? <img src={logo.iconUrl} alt="" width={44} height={44} /> : <span className="bsite-mono" aria-hidden>{name[0]}</span>}
          <span>{name}</span>
        </div>
      </header>
      <main id="main-content">
        <section className="bsite-wrap bsite-hero">
          <div>
            <p className="bsite-tag">{kit.tagline}</p>
            <h1>{site.heroHeadline}</h1>
            <p className="bsite-sub">{site.heroSub}</p>
            <a className="bsite-btn" href={products.length ? "#shop" : contact}>{site.ctaLabel}</a>
          </div>
          <div className="bsite-hero-art" aria-hidden>
            {logo?.iconUrl ? <img src={logo.iconUrl} alt="" /> : <span className="bsite-mono big">{name[0]}</span>}
          </div>
        </section>

        <section className="bsite-band">
          <div className="bsite-wrap bsite-features">
            {site.features.map((f) => (<div key={f.title}><h2>{f.title}</h2><p>{f.text}</p></div>))}
          </div>
        </section>

        <section className="bsite-wrap bsite-about">
          <h2>About {name}</h2>
          <p>{site.about}</p>
        </section>

        {products.length > 0 && (
          <section id="shop" className="bsite-wrap bsite-shop">
            <h2>Shop</h2>
            <div className="bsite-products">
              {products.map((pr) => (
                <article key={pr.name}>
                  <h3>{pr.name}</h3>
                  {pr.price && <p className="bsite-price">{pr.price}</p>}
                  <p className="bsite-short">{pr.short}</p>
                  <p>{pr.description}</p>
                  <a className="bsite-btn ghost" href={contact}>Ask about this</a>
                </article>
              ))}
            </div>
            <p className="bsite-note">Online checkout is coming soon on the CyberAdSpace Marketplace.</p>
          </section>
        )}

        {site.faq.length > 0 && (
          <section className="bsite-wrap bsite-faq">
            <h2>Questions</h2>
            {site.faq.map((f) => (<details key={f.q}><summary>{f.q}</summary><p>{f.a}</p></details>))}
          </section>
        )}
      </main>
      <footer className="bsite-footer">
        <div className="bsite-wrap">
          <span>© {new Date().getFullYear()} {name}</span>
          <a href="https://cyberadspace.com">Brand built with CyberAdSpace</a>
        </div>
      </footer>
    </div>
  );
}
