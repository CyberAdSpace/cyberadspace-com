import { notFound } from "next/navigation";
import crypto from "node:crypto";
import PayWithWebAuth from "./PayWithWebAuth";
import AgentArcade from "../../../_components/AgentArcade";
import { XPR_ACCOUNT, XPR_CHAIN_ID, XPR_ENDPOINTS, XMD_CONTRACT, xmdQuantity, xprConfigured } from "@/lib/xpr";
import { getOrder, out, MAX_REVISIONS, PRICE_USD, type Kit, type LogoOut, type NamesOut, type LaunchOut } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your brand order | CyberAdSpace", robots: { index: false, follow: false } };

const STATUS_TEXT: Record<string, string> = {
  awaiting_payment: "We're waiting on your payment. As soon as it's confirmed, we start building.",
  queued: "Payment received. Your brand is in line to be built.",
  generating: "Your brand is being built right now.",
  review: "Your brand is built and a person on our team is reviewing it.",
  failed: "Your brand is being worked on by our team.",
  revision_requested: "We got your change request and are working on it.",
  delivered: "Your brand is ready.",
};

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ t?: string; revision?: string }> }) {
  const { id } = await params;
  const { t = "", revision } = await searchParams;
  const o = await getOrder(id);
  if (!o || t.length !== o.token.length || !crypto.timingSafeEqual(Buffer.from(t), Buffer.from(o.token))) notFound();

  const name = out<NamesOut>(o, "names")?.selected;
  const ready = o.status === "delivered";
  const kit = out<Kit>(o, "kit");
  const logo = out<LogoOut>(o, "logo");
  const launch = out<LaunchOut>(o, "launch");
  const left = MAX_REVISIONS - o.revisionsUsed;
  const tq = `?t=${encodeURIComponent(t)}`;

  return (
    <main id="main-content" className="site-shell section-space admin-page order-page">
      {!ready && <meta httpEquiv="refresh" content="30" />}
      <div className="eyebrow">Your brand order</div>
      <h1 className="display admin-title">{ready && name ? name : "Thanks for your order"}</h1>
      <p className="start-lede">{STATUS_TEXT[o.status]}</p>
      {revision === "sent" && <p className="ok-note">Change request received. We&apos;ll email you when the update is ready.</p>}
      {revision === "invalid" && <p className="form-error">Please pick at least one part to change and describe the change.</p>}
      {o.paid && !ready && <section className="admin-card"><h2>Watch your agents work</h2><AgentArcade orderId={o.id} token={t} /></section>}

      {!o.paid && xprConfigured() && (
        <section className="admin-card">
          <h2>Pay with your WebAuth wallet</h2>
          {o.xprTx ? (
            <p className="muted">We received your payment and are confirming it. We&apos;ll email you as soon as it clears.</p>
          ) : (
            <PayWithWebAuth orderId={o.id} token={t} account={XPR_ACCOUNT} quantity={xmdQuantity(PRICE_USD)} chainId={XPR_CHAIN_ID} endpoints={XPR_ENDPOINTS} contract={XMD_CONTRACT} />
          )}
        </section>
      )}
      {ready && kit && (
        <>
          <section className="admin-card">
            <h2>Your website</h2>
            <p><a className="btn btn-primary" href={`/b/${o.slug}`} target="_blank" rel="noopener noreferrer">Open {name} ↗</a></p>
            <p className="muted">Want it on your own domain? Reply to our email and we&apos;ll connect it.</p>
          </section>
          <section className="admin-card">
            <h2>Logo files</h2>
            <div className="logo-row">
              {logo?.iconUrl && <img src={`${logo.iconUrl}${tq}`} alt={`${name} icon`} width={140} height={140} className="logo-preview" />}
              <div className="logo-links">
                {logo?.iconUrl && <a href={`${logo.iconUrl}${tq}`} download>Icon (PNG)</a>}
                <a href={`/api/brand-svg/${o.id}/logo.svg${tq}&download=1`}>Main logo (SVG)</a>
                <a href={`/api/brand-svg/${o.id}/logo-bw.svg${tq}&download=1`}>Black-and-white logo (SVG)</a>
                <a href={`/api/brand-svg/${o.id}/profile.svg${tq}&download=1`}>Profile image (SVG)</a>
                <a href={`/api/brand-svg/${o.id}/banner.svg${tq}&download=1`}>Social banner (SVG)</a>
              </div>
            </div>
          </section>
          <section className="admin-card">
            <h2>Brand kit</h2>
            <p className="kit-tagline">&ldquo;{kit.tagline}&rdquo;</p>
            <div className="swatches">{Object.entries(kit.palette).map(([k, hex]) => (<div key={k}><span style={{ background: hex }} /><small>{k}<br />{hex}</small></div>))}</div>
            <p><strong>Fonts:</strong> {kit.fonts.heading} and {kit.fonts.body} (free on Google Fonts)</p>
            <p>{kit.story}</p>
          </section>
          {launch && (
            <section className="admin-card">
              <h2>Launch kit</h2>
              <p><strong>Profile bio:</strong> {launch.bio}</p>
              <ol className="posts">{launch.posts.map((p, n) => <li key={n}><span className="pill">{p.platform}</span><p>{p.caption}</p><p className="muted">{p.hashtags.join(" ")}</p></li>)}</ol>
            </section>
          )}
          <section className="admin-card">
            <h2>Request changes</h2>
            {left > 0 ? (
              <form method="post" action={`/api/order/${o.id}/revision`} className="project-form">
                <input type="hidden" name="t" value={t} />
                <p className="muted">You have {left} revision round{left === 1 ? "" : "s"} left. Pick what to change:</p>
                <div className="chip-row">
                  {([["kit", "Colors, fonts & tagline"], ["logo", "Logo"], ["site", "Website text"], ["storefront", "Product descriptions"], ["launch", "Social posts"]] as const).map(([v, label]) => (
                    <label key={v} className="check"><input type="checkbox" name="section" value={v} /> {label}</label>
                  ))}
                </div>
                <label htmlFor="rev-note">What should change?</label>
                <textarea id="rev-note" name="note" rows={4} required minLength={5} maxLength={1500} placeholder="Be specific. Example: make the logo simpler, use navy instead of green." />
                <button className="btn btn-primary" type="submit">Send change request</button>
                <p className="form-help">Want a different name? Email Contact@CyberAdSpace.com.</p>
              </form>
            ) : (
              <p className="muted">You&apos;ve used both revision rounds. Need more changes? Email Contact@CyberAdSpace.com for a quote.</p>
            )}
          </section>
        </>
      )}
      <p className="start-fine">Questions? Email Contact@CyberAdSpace.com and include order {o.id}.</p>
    </main>
  );
}
