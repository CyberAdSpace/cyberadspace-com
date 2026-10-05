import type { Metadata } from "next";
import StartForm from "./StartForm";
import { PRICE_USD } from "@/lib/orders";
import { stripeConfigured } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Launch your brand · $350 | CyberAdSpace",
  description: "Brand name, logo, brand kit, one-page website, marketplace storefront and launch kit. AI-assisted and reviewed by a person. $350.",
};

const INCLUDED: [string, string][] = [
  ["Brand name", "5 options, with a domain availability check and a basic trademark search"],
  ["Logo", "Main logo, icon version, and a black-and-white version"],
  ["Brand kit", "Colors, fonts, tagline, and a short brand story"],
  ["One-page website", "Hosted for you on cyberadspace.com, or on your own domain"],
  ["Marketplace storefront", "Listed on the CyberAdSpace Marketplace with up to 5 products"],
  ["Launch kit", "5 social media posts, plus a profile image and banner"],
  ["Revisions", "2 rounds"],
  ["Delivery", "Within 72 hours of payment"],
];

export default async function StartPage({ searchParams }: { searchParams: Promise<{ canceled?: string }> }) {
  const { canceled } = await searchParams;
  return (
    <main id="main-content" className="creation-home start-page">
      <section className="site-shell section-space start-layout">
        <div className="start-copy">
          <div className="eyebrow">Brand Starter</div>
          <h1 className="display start-title">Launch your brand.<br /><span>${PRICE_USD}.</span></h1>
          <p className="start-lede">Tell us your idea. Our AI builds your name, logo, brand kit, website, storefront and launch posts. A person reviews every piece before it reaches you.</p>
          <table className="included-table">
            <caption className="eyebrow">What&apos;s included</caption>
            <tbody>
              {INCLUDED.map(([k, v]) => (<tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>))}
            </tbody>
          </table>
          <p className="start-fine"><strong>Not included:</strong> the domain itself (about $12–$20 a year), extra pages, custom AI features, product photos, printing, trademark registration, and inventory.</p>
          <p className="start-fine"><strong>Marketplace fee:</strong> 3.5% on sales made through the CyberAdSpace Marketplace. Nothing on sales you make elsewhere.</p>
          <p className="start-fine">We help you launch and promote your brand. We can&apos;t promise sales or income.</p>
        </div>
        <div className="start-form-wrap">
          {canceled && <p className="form-error">Checkout was canceled. Your answers weren&apos;t charged; you can submit again whenever you&apos;re ready.</p>}
          <StartForm price={PRICE_USD} card={stripeConfigured()} />
        </div>
      </section>
    </main>
  );
}
