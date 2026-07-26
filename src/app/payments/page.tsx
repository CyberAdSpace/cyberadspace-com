import type { Metadata } from "next";
import Script from "next/script";
import PayDemo from "../_components/PayDemo";

export const metadata: Metadata = {
  title: "CyberAdSpace Payments — Crypto Payment Processing for Merchants",
  description:
    "Accept crypto at the counter and online. Flat 1% processing on the XPR Network — settlement in about a second, no chargebacks, no monthly fees, plus reloadable CAS gift cards for your customers.",
};

const STEPS = [
  {
    n: "01",
    title: "We set you up",
    body: "We create your merchant account on the XPR Network, hand you a QR terminal for the counter, and wire crypto checkout into your website. No hardware to buy.",
  },
  {
    n: "02",
    title: "Customers pay in seconds",
    body: "They scan the QR with the WebAuth wallet or tap a reloadable CAS card. The payment clears on-chain in about a second — while they're still at the counter.",
  },
  {
    n: "03",
    title: "You keep more",
    body: "Flat 1% per transaction. No monthly fees, no terminals to lease, and no chargebacks — on-chain payments are final.",
  },
];

const FEATURES = [
  {
    k: "QR CHECKOUT AT THE COUNTER",
    v: "A printed code or a screen — customers scan and pay from their phone. Works at farm stands, dispensaries, food trucks, anywhere.",
  },
  {
    k: "ONLINE CHECKOUT",
    v: "A pay-with-crypto button for your website, wired to your merchant account.",
  },
  {
    k: "RELOADABLE CAS CARDS",
    v: "Sell gift cards with crypto on them. Customers load, spend, and reload — at your store and every merchant on our processor.",
  },
  {
    k: "INSTANT SETTLEMENT",
    v: "XPR Network finality in about a second. No 2–3 business day holds on your money.",
  },
  {
    k: "NO CHARGEBACKS",
    v: "On-chain payments are final. Fraudulent chargebacks stop being a line item.",
  },
  {
    k: "MERCHANT DASHBOARD",
    v: "Every sale, memo-tagged on-chain, viewable in a public explorer today — merchant reporting dashboard rolling out with the CAS token launch.",
  },
];

export default function PaymentsPage() {
  return (
    <main className="relative overflow-hidden">
      {/* HERO */}
      <section className="relative pt-40 md:pt-48 pb-16 md:pb-20 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal">
            <div className="eyebrow mb-4">CyberAdSpace Payments · XPR Network</div>
            <h1 className="display text-white font-bold text-5xl md:text-7xl leading-[0.95]">
              Accept crypto.
              <br />
              <span style={{ color: "var(--text-muted)" }}>Keep more.</span>
            </h1>
            <p
              className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              We&apos;re the processor. We set your business up to take crypto at the
              counter and online — QR checkout, WebAuth wallets, and reloadable CAS
              cards — with settlement in about a second and no chargebacks, ever.
            </p>
          </div>

          {/* STATS */}
          <div className="reveal mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl">
            {[
              ["1%", "FLAT PER SALE"],
              ["$0", "MONTHLY FEES"],
              ["~1s", "SETTLEMENT"],
              ["0", "CHARGEBACKS"],
            ].map(([big, small]) => (
              <div key={small} className="pay-stat">
                <div className="pay-stat-big">{big}</div>
                <div className="pay-stat-small">{small}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-12">
            <div className="eyebrow mb-4">How it works</div>
            <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[0.95]">
              Cash-register simple.
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="reveal pay-step" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="pay-step-n">{s.n}</div>
                <h3 className="text-white font-semibold text-xl mb-3">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES + DEMO */}
      <section className="relative py-16 md:py-24 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-start">
          <div className="reveal">
            <div className="eyebrow mb-4">What you get</div>
            <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[0.95] mb-10">
              The full counter,
              <br />
              <span style={{ color: "var(--text-muted)" }}>wired for crypto.</span>
            </h2>
            <div className="space-y-6">
              {FEATURES.map((f) => (
                <div key={f.k}>
                  <div
                    className="mono text-[10px] tracking-[0.3em] mb-1"
                    style={{ color: "var(--accent)" }}
                  >
                    {f.k}
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {f.v}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="reveal md:sticky md:top-28">
            <PayDemo />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-3xl mx-auto text-center reveal">
          <div className="eyebrow mb-4 justify-center">Become a merchant</div>
          <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95]">
            Get set up this week.
          </h2>
          <p
            className="mt-6 text-base md:text-lg leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            Tell us about your business and we&apos;ll bring the terminal, the
            checkout, and the CAS cards to you.
          </p>
          <a
            href="mailto:contact@cyberadspace.com?subject=Set%20me%20up%20with%20CyberAdSpace%20Payments"
            className="btn btn-cyan mt-9"
          >
            Set Up My Business <span aria-hidden>→</span>
          </a>
        </div>
      </section>

      <Script id="reveal-payments" strategy="afterInteractive">
        {`
          if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
              });
            }, { threshold: 0.12 });
            document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
          } else {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
          }
        `}
      </Script>
    </main>
  );
}
