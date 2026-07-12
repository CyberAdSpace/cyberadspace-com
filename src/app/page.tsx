import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import NotifyForm from "./NotifyForm";
import OrbitMap from "./_components/OrbitMap";
import WebAuthConnect from "./_components/WebAuthConnect";
import { BRANDS } from "@/data/brands";

const FILMS = [
  { id: "01", title: "The Fridge", runtime: "2:30", poster: "/assets/poster-01-fridge.png" },
  { id: "02", title: "Deej's Song", runtime: "2:15", poster: "/assets/poster-02-deej.png" },
  { id: "03", title: "The Driver", runtime: "2:45", poster: "/assets/poster-03-driver.png" },
  { id: "04", title: "Sunday", runtime: "2:30", poster: "/assets/poster-04-sunday.png" },
  { id: "05", title: "Anniversary", runtime: "3:00", poster: "/assets/poster-05-anniversary.png" },
];

export default function Home() {
  const brandCount = BRANDS.length;

  return (
    <>
      {/* HERO */}
      <section
        id="top"
        className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden"
      >
        <Image
          src="/assets/cyber-hero-space.png"
          alt="A Cybertruck orbits Earth above a glowing Florida"
          fill
          priority
          sizes="100vw"
          className="hero-image object-cover hidden md:block"
        />
        <Image
          src="/assets/cyber-hero-space-mobile.png"
          alt="A Cybertruck orbits Earth above a glowing Florida"
          fill
          priority
          sizes="100vw"
          className="hero-image object-cover md:hidden"
        />
        <div className="scanlines" />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(4,6,13,0.55) 0%, rgba(4,6,13,0.15) 30%, rgba(4,6,13,0.15) 50%, rgba(4,6,13,0.92) 100%)",
          }}
        />

        <div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 mono text-[10px] tracking-[0.32em] z-10"
          style={{ color: "var(--text-faint)" }}
        >
          ↓  DESCEND
        </div>
      </section>

      {/* STATS BAR */}
      <section className="relative py-10 border-y" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10">
          {[
            { n: String(brandCount), l: "Brands in the family" },
            { n: String(brandCount), l: "Live right now" },
            { n: "5", l: "Films landing 2026" },
            { n: "1", l: "Studio behind all of it" },
          ].map((s) => (
            <div key={s.l}>
              <div className="display text-white font-bold text-4xl md:text-5xl" style={{ color: "var(--accent)" }}>
                {s.n}
              </div>
              <div className="mono text-[10px] tracking-[0.28em] mt-2" style={{ color: "var(--text-muted)" }}>
                {s.l.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BRANDS */}
      <section id="brands" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-14 md:mb-20">
            <div className="eyebrow mb-4">The Family</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] max-w-4xl">
              {brandCount} independent brands.
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                One marketplace they all live in.
              </span>
            </h2>
            <p
              className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Every brand here is one we built. Tap any logo to jump straight
              to that brand&apos;s own site — shop, read, book, or explore.
            </p>
          </div>

          <div className="float-grid">
            {BRANDS.map((brand, i) => (
              <div
                key={brand.slug}
                className="reveal float-brand"
                style={
                  {
                    ["--brand-accent" as string]: brand.accent,
                    transitionDelay: `${i * 45}ms`,
                    ["--float-delay" as string]: `${(i % 5) * 0.9}s`,
                  } as React.CSSProperties
                }
              >
                <a
                  href={brand.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="float-brand-link"
                >
                  <span className="float-brand-logo">
                    <Image
                      src={brand.logo}
                      alt={`${brand.name} logo`}
                      width={340}
                      height={160}
                      className="float-brand-img"
                    />
                  </span>
                  <span className="float-brand-tagline">{brand.tagline}</span>
                </a>
                <a href={`mailto:${brand.email}`} className="float-brand-email">
                  {brand.email}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ORBIT MAP */}
      <section id="map" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-14 md:mb-16">
            <div className="eyebrow mb-4">The Orbit Map</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] max-w-4xl">
              Move the truck.
              <br />
              <span style={{ color: "var(--text-muted)" }}>Unlock the local market.</span>
            </h2>
            <p
              className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Every territory on the map has its own exclusive marketplace.
              Send the Cybertruck to a city and see who&apos;s trading there.
            </p>
          </div>
          <div className="reveal">
            <OrbitMap />
          </div>
        </div>
      </section>

      {/* CAS TOKEN */}
      <section id="cas" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="reveal">
            <div className="eyebrow mb-4">The CAS Token · XPR Network</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95]">
              One token.
              <br />
              <span style={{ color: "var(--text-muted)" }}>Every brand.</span>
            </h2>
            <p
              className="mt-6 max-w-xl text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              CAS is CyberAdSpace&apos;s own currency, built on the XPR
              Network. It powers payments across the whole family — and we
              bring merchants along with us.
            </p>
            <div className="mt-8 space-y-5">
              <div>
                <div className="mono text-[10px] tracking-[0.3em] mb-1" style={{ color: "var(--accent)" }}>
                  CRYPTO CHECKOUT
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  We set merchants up with crypto payment processing, end to end.
                </p>
              </div>
              <div>
                <div className="mono text-[10px] tracking-[0.3em] mb-1" style={{ color: "var(--accent)" }}>
                  RELOADABLE CAS CARDS
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  A gift card with crypto on it. Load it, spend it, reload it.
                </p>
              </div>
              <div>
                <div className="mono text-[10px] tracking-[0.3em] mb-1" style={{ color: "var(--accent)" }}>
                  SPEND IT ANYWHERE WE PROCESS
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  Your card works at every merchant on the CyberAdSpace processor.
                </p>
              </div>
            </div>
            <a
              href="mailto:contact@cyberadspace.com?subject=Set%20up%20crypto%20payments%20for%20my%20business"
              className="btn btn-cyan mt-9"
            >
              Set Up Crypto Payments <span aria-hidden>→</span>
            </a>
          </div>
          <div className="reveal flex flex-col items-center gap-8">
            <Image
              src="/assets/cas-card.png"
              alt="The reloadable CAS card by CyberAdSpace"
              width={1064}
              height={725}
              className="cas-card-img"
            />
            <WebAuthConnect />
          </div>
        </div>
      </section>

      {/* FILMS STRIP */}
      <section
        id="films-strip"
        className="relative py-20 md:py-28 border-t border-b overflow-hidden"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto px-6 md:px-10">
          <div className="reveal flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="eyebrow mb-4">The Anthology · 2026</div>
              <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[0.95] max-w-2xl">
                We&apos;re also making a movie.
              </h2>
              <p className="mt-4 max-w-xl text-base leading-relaxed" style={{ color: "var(--text-muted)" }}>
                Five short films set in the CyberAdSpace universe. Every
                product in every scene is one of our brands. Nobody explains
                anything.
              </p>
            </div>
            <Link href="/films" className="btn btn-cyan self-start md:self-end">
              See the Films <span aria-hidden>→</span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-6 reveal">
            {FILMS.map((f) => (
              <Link key={f.id} href="/films" className="poster block">
                <Image
                  src={f.poster}
                  alt={f.title}
                  fill
                  sizes="(max-width: 768px) 50vw, 20vw"
                  className="object-cover"
                />
                <div className="poster-meta">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[9px] tracking-[0.25em]" style={{ color: "var(--accent)" }}>
                      NO. {f.id}
                    </span>
                    <span className="mono text-[9px] tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                      {f.runtime}
                    </span>
                  </div>
                  <h3 className="display text-white font-bold text-lg md:text-xl leading-tight">
                    {f.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* STUDIO */}
      <section id="studio" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="reveal">
            <div className="eyebrow mb-6">The Studio</div>
            <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[1.05] mb-10">
              CyberAdSpace is a Florida studio that builds brands, ships
              product, and makes short films about the whole thing.
            </h2>
          </div>
          <div className="reveal grid md:grid-cols-2 gap-10 md:gap-14 text-base md:text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>
              We started with a delivery truck. The idea was that people would
              pay to advertise while we drove. Then we realized we already had
              the brands. Then we realized we could put them all in one place.
              This is that place.
            </p>
            <p>
              Every brand on CyberAdSpace is owned or operated by us. They span
              faith, cannabis, food, music, real estate, and more — all sharing
              one universe, one aesthetic, and one address on the web.
            </p>
          </div>
        </div>
      </section>

      {/* NOTIFY */}
      <section
        id="notify"
        className="relative py-24 md:py-32 px-6 md:px-10 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <div className="reveal">
            <div className="eyebrow mb-6">Mission Control</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] mb-6">
              Get on the manifest.
            </h2>
            <p className="text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
              One email when a new brand opens. One when the films drop. Zero
              in between.
            </p>
          </div>
          <NotifyForm />
        </div>
      </section>

      {/* Scroll reveal */}
      <Script id="reveal" strategy="afterInteractive">
        {`
          if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) {
                  e.target.classList.add('in');
                  obs.unobserve(e.target);
                }
              });
            }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
            document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
          } else {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
          }
        `}
      </Script>
    </>
  );
}
