import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import {
  getOrder, out, STEP_KEYS, STEP_LABELS, STATUS_LABEL, MAX_REVISIONS,
  type StepKey, type Order, type Brief, type NamesOut, type Kit, type LogoOut, type SiteOut, type StorefrontOut, type LaunchOut,
} from "@/lib/orders";

export const dynamic = "force-dynamic";
export const metadata = { title: "Review brand order | CyberAdSpace", robots: { index: false, follow: false } };

function RedoForm({ id, step, label }: { id: string; step: StepKey; label?: string }) {
  return (
    <form method="post" action={`/api/admin/orders/${id}`} className="redo-form">
      <input type="hidden" name="action" value="redo" />
      <input type="hidden" name="step" value={step} />
      <label htmlFor={`note-${step}`}>{label ?? "Send back with notes"}</label>
      <textarea id={`note-${step}`} name="note" rows={2} placeholder="What should change? Example: warmer colors, no leaf in the logo, shorter headline" maxLength={1000} />
      <button className="btn" type="submit">Redo this part</button>
    </form>
  );
}

function StepBody({ o, k }: { o: Order; k: StepKey }) {
  switch (k) {
    case "brief": {
      const b = out<Brief>(o, k)!;
      return (<><p>{b.summary}</p><p><strong>Audience:</strong> {b.audience}</p><p><strong>Personality:</strong> {b.personality.join(", ")}</p><ul>{b.keyMessages.map((m) => <li key={m}>{m}</li>)}</ul></>);
    }
    case "names": {
      const n = out<NamesOut>(o, k)!;
      return (
        <>
          <ul className="name-list">
            {n.options.map((opt) => (
              <li key={opt.name} className={opt.name === n.selected ? "picked" : ""}>
                <div>
                  <strong>{opt.name}</strong> {opt.name === n.selected && <span className="pill ok">chosen</span>}
                  <div className="muted">{opt.why}</div>
                  <div className="muted">{opt.domain}: {opt.domainAvailable === true ? "looks available" : opt.domainAvailable === false ? "taken" : "couldn't check"}</div>
                </div>
                {opt.name !== n.selected && (
                  <form method="post" action={`/api/admin/orders/${o.id}`}>
                    <input type="hidden" name="action" value="select_name" /><input type="hidden" name="name" value={opt.name} />
                    <button className="text-link" type="submit">Use this name</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <p className="muted">Before approving, search the chosen name at <a href="https://tmsearch.uspto.gov/" target="_blank" rel="noopener noreferrer">USPTO trademark search</a>. Changing the name rebuilds the kit, logo, site, storefront and launch kit.</p>
        </>
      );
    }
    case "kit": {
      const kit = out<Kit>(o, k)!;
      return (
        <>
          <p className="kit-tagline">&ldquo;{kit.tagline}&rdquo;</p>
          <div className="swatches">{Object.entries(kit.palette).map(([name, hex]) => (<div key={name}><span style={{ background: hex }} /><small>{name}<br />{hex}</small></div>))}</div>
          <p><strong>Fonts:</strong> {kit.fonts.heading} (headings), {kit.fonts.body} (body)</p>
          <p><strong>Voice:</strong> {kit.voice}</p>
          <p>{kit.story}</p>
        </>
      );
    }
    case "logo": {
      const l = out<LogoOut>(o, k)!;
      return (
        <>
          <div className="logo-row">
            {l.iconUrl ? <img src={l.iconUrl} alt="Generated logo icon" width={180} height={180} className="logo-preview" /> : <p className="form-error">No icon image (MOCK mode). The page uses a letter monogram instead.</p>}
            <div className="logo-links">
              {(["logo", "logo-bw", "banner", "profile"] as const).map((kind) => (<a key={kind} href={`/api/brand-svg/${o.id}/${kind}.svg`} target="_blank" rel="noopener noreferrer">{kind}.svg ↗</a>))}
            </div>
          </div>
          <details><summary>Image prompt used</summary><pre className="prompt">{l.prompt}</pre></details>
          <p className="muted">Check: spelled nothing, looks original (not like a known brand), reads at small size.</p>
        </>
      );
    }
    case "site": {
      const s = out<SiteOut>(o, k)!;
      return (
        <>
          {o.slug && <p><Link href={`/b/${o.slug}`} target="_blank">Open the website preview ↗</Link></p>}
          <p><strong>{s.heroHeadline}</strong><br />{s.heroSub}</p>
          <ul>{s.features.map((f) => <li key={f.title}><strong>{f.title}:</strong> {f.text}</li>)}</ul>
          <details><summary>About + FAQ</summary><p>{s.about}</p>{s.faq.map((f) => <p key={f.q}><strong>{f.q}</strong><br />{f.a}</p>)}</details>
        </>
      );
    }
    case "storefront": {
      const s = out<StorefrontOut>(o, k)!;
      return s.products.length ? (<ul>{s.products.map((p) => <li key={p.name}><strong>{p.name}</strong> {p.price && `· ${p.price}`}<br /><span className="muted">{p.short}</span><br />{p.description}</li>)}</ul>) : <p className="muted">The customer didn&apos;t list any products.</p>;
    }
    case "launch": {
      const l = out<LaunchOut>(o, k)!;
      return (<><p><strong>Bio:</strong> {l.bio}</p><ol>{l.posts.map((p, i) => <li key={i}><span className="pill">{p.platform}</span> {p.caption} <span className="muted">{p.hashtags.join(" ")}</span></li>)}</ol></>);
    }
  }
}

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { id } = await params;
  const o = await getOrder(id);
  if (!o) notFound();
  const name = out<NamesOut>(o, "names")?.selected;
  const busy = o.status === "generating" || o.status === "queued" || o.status === "revision_requested";
  const allDone = STEP_KEYS.every((k) => o.steps[k].status === "done");
  const i = o.intake;

  return (
    <main id="main-content" className="site-shell section-space admin-page">
      {busy && <meta httpEquiv="refresh" content="8" />}
      <p><Link href="/admin" className="text-link">← All orders</Link></p>
      <div className="admin-head">
        <div>
          <h1 className="display admin-title">{name ?? "New brand"}</h1>
          <p className="muted">{o.customer.name} · <a href={`mailto:${o.customer.email}`}>{o.customer.email}</a> · Order {o.id} · Revisions used {o.revisionsUsed}/{MAX_REVISIONS}</p>
        </div>
        <span className={`pill big s-${o.status}`}>{STATUS_LABEL[o.status]}</span>
      </div>
      {o.mock && <p className="form-error">MOCK mode: no OpenAI key was set, so this order has placeholder content. Add OPENAI_API_KEY in Vercel and redo the brief to rebuild it for real.</p>}

      <div className="admin-actions">
        {!o.paid && (
          <form method="post" action={`/api/admin/orders/${o.id}`} className="inline-form">
            <input type="hidden" name="action" value="start" />
            <label htmlFor="paidVia">Paid via</label>
            <input id="paidVia" name="paidVia" placeholder="Zelle, XPR, cash…" maxLength={60} required />
            <button className="btn btn-primary" type="submit">Mark paid &amp; start building</button>
          </form>
        )}
        {o.paid && (o.status === "failed" || (!allDone && !busy)) && (
          <form method="post" action={`/api/admin/orders/${o.id}`}><input type="hidden" name="action" value="resume" /><button className="btn btn-primary" type="submit">Resume building</button></form>
        )}
        {busy && <p className="muted">Building… this page refreshes on its own.</p>}
        {allDone && (o.status === "review" || o.status === "delivered") && (
          <form method="post" action={`/api/admin/orders/${o.id}`} className="approve-form">
            <input type="hidden" name="action" value="approve" />
            <ul className="checklist">
              <li><label><input type="checkbox" required /> USPTO search done, no conflict found</label></li>
              <li><label><input type="checkbox" required /> Logo is spelled right (or has no text) and looks original</label></li>
              <li><label><input type="checkbox" required /> No false claims, fake reviews or health claims</label></li>
              <li><label><input type="checkbox" required /> Website looks right on a phone</label></li>
              <li><label><input type="checkbox" required /> Products and prices match what the customer sent</label></li>
            </ul>
            <label htmlFor="approve-note">Note to the customer (optional)</label>
            <textarea id="approve-note" name="note" rows={2} maxLength={1000} />
            <button className="btn btn-primary" type="submit">{o.status === "delivered" ? "Re-send to customer" : "Approve & deliver"}</button>
          </form>
        )}
      </div>

      <details className="admin-card">
        <summary><strong>What the customer submitted</strong></summary>
        <dl className="intake">
          <dt>Idea</dt><dd>{i.idea}</dd>
          <dt>Audience</dt><dd>{i.audience}</dd>
          <dt>Products</dt><dd>{i.products.length ? i.products.map((p) => `${p.name}${p.price ? ` (${p.price})` : ""}${p.details ? `: ${p.details}` : ""}`).join("; ") : "None"}</dd>
          <dt>Style</dt><dd>{i.style.join(", ") || "—"}</dd>
          <dt>Colors</dt><dd>Likes: {i.colorsLike || "—"} · Avoid: {i.colorsAvoid || "—"}</dd>
          <dt>Name ideas</dt><dd>{i.nameIdeas || "—"}</dd>
          <dt>Admires</dt><dd>{i.admire || "—"}</dd>
          <dt>Languages</dt><dd>{i.languages}</dd>
          <dt>Own domain</dt><dd>{i.ownDomain || "—"}</dd>
        </dl>
      </details>

      {STEP_KEYS.map((k) => {
        const s = o.steps[k];
        return (
          <section key={k} className="admin-card">
            <div className="card-head"><h2>{STEP_LABELS[k]}</h2><span className={`pill st-${s.status}`}>{s.status}</span></div>
            {s.status === "error" && <p className="form-error">{s.error}</p>}
            {(s.notes?.length ?? 0) > 0 && s.status !== "done" && <p className="muted">Pending notes: {s.notes!.join(" · ")}</p>}
            {s.status === "done" && <StepBody o={o} k={k} />}
            {s.status === "done" && !busy && <RedoForm id={o.id} step={k} />}
          </section>
        );
      })}

      <section className="admin-card">
        <h2>History</h2>
        <ul className="history">{[...o.history].reverse().map((h, n) => <li key={n}><span className="muted">{new Date(h.at).toLocaleString("en-US", { timeZone: "America/New_York", dateStyle: "medium", timeStyle: "short" })}</span> {h.event}{h.note && <> · <em>{h.note}</em></>}</li>)}</ul>
      </section>
    </main>
  );
}
