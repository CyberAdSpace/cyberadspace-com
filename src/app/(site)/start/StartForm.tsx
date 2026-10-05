"use client";

import { useEffect, useState, type FormEvent } from "react";

const STYLES = ["Bold", "Calm", "Playful", "Luxury", "Earthy", "Techy", "Faith-based", "Vintage", "Modern", "Warm", "Minimal", "Bright"];

type P = { name: string; price: string; details: string };

export default function StartForm({ price, card }: { price: number; card: boolean }) {
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [style, setStyle] = useState<string[]>([]);
  const [products, setProducts] = useState<P[]>([{ name: "", price: "", details: "" }]);

  useEffect(() => { setReady(true); }, []);

  function toggleStyle(s: string) {
    setStyle((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= 3 ? cur : [...cur, s]));
  }
  function setProduct(i: number, key: keyof P, v: string) {
    setProducts((cur) => cur.map((p, j) => (j === i ? { ...p, [key]: v } : p)));
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: f.get("name"), email: f.get("email"), idea: f.get("idea"), audience: f.get("audience"),
      products, style, colorsLike: f.get("colorsLike"), colorsAvoid: f.get("colorsAvoid"),
      nameIdeas: f.get("nameIdeas"), admire: f.get("admire"), languages: f.get("languages"),
      ownDomain: f.get("ownDomain"), website: f.get("website"), agree: f.get("agree") === "on",
    };
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || "Something went wrong. Please try again.");
      window.location.href = json.checkoutUrl || json.next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form className="project-form start-form" onSubmit={submit}>
      <fieldset disabled={!ready || busy}>
        <div className="form-row">
          <div><label htmlFor="s-name">Your name</label><input id="s-name" name="name" autoComplete="name" required maxLength={100} /></div>
          <div><label htmlFor="s-email">Your email</label><input id="s-email" name="email" type="email" autoComplete="email" required maxLength={200} /></div>
        </div>

        <label htmlFor="s-idea">1. Your idea <span className="req-note">in 1–3 sentences</span></label>
        <textarea id="s-idea" name="idea" required minLength={20} maxLength={900} rows={3} placeholder="Example: Small-batch hot sauce made with Florida peppers, sold online and at farmers markets." />

        <label htmlFor="s-audience">2. Who it&apos;s for</label>
        <input id="s-audience" name="audience" required maxLength={500} placeholder="Age, interests, location. Example: Foodies 25–45 in Tampa Bay" />

        <fieldset className="sub-fieldset">
          <legend>3. What you sell <span className="req-note">up to 5 products or services</span></legend>
          {products.map((p, i) => (
            <div className="product-row" key={i}>
              <input aria-label={`Product ${i + 1} name`} placeholder="Name" value={p.name} maxLength={80} onChange={(e) => setProduct(i, "name", e.target.value)} />
              <input aria-label={`Product ${i + 1} price`} placeholder="Price" value={p.price} maxLength={30} onChange={(e) => setProduct(i, "price", e.target.value)} />
              <input aria-label={`Product ${i + 1} details`} placeholder="Short details (size, flavor, what's included)" value={p.details} maxLength={300} onChange={(e) => setProduct(i, "details", e.target.value)} />
            </div>
          ))}
          {products.length < 5 && <button type="button" className="text-link add-product" onClick={() => setProducts([...products, { name: "", price: "", details: "" }])}>+ Add another</button>}
        </fieldset>

        <fieldset className="sub-fieldset">
          <legend>4. Style <span className="req-note">pick up to 3</span></legend>
          <div className="chip-row">
            {STYLES.map((s) => (
              <button type="button" key={s} className={`chip${style.includes(s) ? " chip-on" : ""}`} aria-pressed={style.includes(s)} onClick={() => toggleStyle(s)}>{s}</button>
            ))}
          </div>
        </fieldset>

        <div className="form-row">
          <div><label htmlFor="s-cl">5. Colors you like</label><input id="s-cl" name="colorsLike" maxLength={200} placeholder="Example: deep green, gold" /></div>
          <div><label htmlFor="s-ca">Colors to avoid</label><input id="s-ca" name="colorsAvoid" maxLength={200} placeholder="Example: pink" /></div>
        </div>

        <label htmlFor="s-names">6. Name ideas or words that must be in the name <span className="req-note">optional</span></label>
        <input id="s-names" name="nameIdeas" maxLength={300} />

        <label htmlFor="s-admire">7. Brands you admire <span className="req-note">for inspiration only; we never copy</span></label>
        <input id="s-admire" name="admire" maxLength={300} />

        <div className="form-row">
          <div><label htmlFor="s-lang">8. Languages</label><input id="s-lang" name="languages" maxLength={100} defaultValue="English" /></div>
          <div><label htmlFor="s-domain">9. Domain you already own <span className="req-note">optional</span></label><input id="s-domain" name="ownDomain" maxLength={100} placeholder="yourbrand.com" /></div>
        </div>

        <div className="form-hp" aria-hidden="true"><label htmlFor="s-website">Leave this empty</label><input id="s-website" name="website" tabIndex={-1} autoComplete="off" /></div>

        <label className="agree">
          <input type="checkbox" name="agree" required />
          <span>I understand the work is AI-assisted and reviewed by a person, and that the name check is a basic search, not legal trademark clearance.</span>
        </label>

        <button className="btn btn-primary" type="submit">{busy ? "Working…" : card ? <>Continue to payment · ${price} <span aria-hidden>↗</span></> : <>Submit my order · ${price} <span aria-hidden>↗</span></>}</button>
        {!card && <p className="form-help">We&apos;ll email you how to pay. Nothing is built or charged until payment is confirmed.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </fieldset>
    </form>
  );
}
