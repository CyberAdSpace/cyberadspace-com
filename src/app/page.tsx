import Image from "next/image";
import Script from "next/script";
import NotifyForm from "./NotifyForm";

const FILMS = [
  {
    id: "01",
    slug: "the-fridge",
    title: "The Fridge",
    runtime: "2:30",
    logline:
      "A night-shift nurse comes home to a couch, a game she doesn't care about, and a fridge full of small mercies.",
    brands: ["Palm Polish", "The Green Oven", "Canamo Cafe"],
    poster: "/assets/poster-01-fridge.png",
  },
  {
    id: "02",
    slug: "deejs-song",
    title: "Deej's Song",
    runtime: "2:15",
    logline:
      "A clinic breakroom, two chairs, and a demo that took eight months to record.",
    brands: ["Elevated Remedies", "Religion Relief", "Antria's Academy"],
    poster: "/assets/poster-02-deej.png",
  },
  {
    id: "03",
    slug: "the-driver",
    title: "The Driver",
    runtime: "2:45",
    logline:
      "The only character you meet all week. He does not sell anything. He delivers.",
    brands: ["Williams Produce", "CyberAdSpace"],
    poster: "/assets/poster-03-driver.png",
  },
  {
    id: "04",
    slug: "sunday",
    title: "Sunday",
    runtime: "2:30",
    logline:
      "One house, two rituals, and a phone that keeps buzzing on the counter.",
    brands: ["The Faith Vault", "The Hemp Dispensary"],
    poster: "/assets/poster-04-sunday.png",
  },
  {
    id: "05",
    slug: "anniversary",
    title: "Anniversary",
    runtime: "3:00",
    logline:
      "A detailed car, a locked bedroom door, and a whole week catching up with itself.",
    brands: ["Palm Polish", "LustLine", "Full Cast"],
    poster: "/assets/poster-05-anniversary.png",
  },
];

const ECOSYSTEM = [
  "Palm Polish",
  "The Green Oven",
  "Canamo Cafe",
  "The Hemp Dispensary",
  "Williams Produce",
  "The Faith Vault",
  "Antria's Academy",
  "Elevated Remedies",
  "Religion Relief",
  "LustLine",
];

function Wordmark({ className = "" }: { className?: string }) {
  // Jagged tri-line wordmark referencing the tee-proof aesthetic
  return (
    <svg
      viewBox="0 0 240 40"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="CyberAdSpace Films"
    >
      <defs>
        <linearGradient id="wm-g" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffb84d" />
          <stop offset="1" stopColor="#ffa31a" />
        </linearGradient>
      </defs>
      {/* Three jagged lines — nod to the tee proof */}
      <path
        d="M4 8 L14 8 L20 4 L30 12 L40 6 L54 10"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M4 20 L18 20 L26 16 L36 22 L48 18 L60 22"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <path
        d="M4 32 L12 32 L22 28 L34 34 L44 30 L58 32"
        stroke="url(#wm-g)"
        strokeWidth="2"
        fill="none"
        strokeLinecap="square"
      />
      <text
        x="72"
        y="18"
        fill="#f5f5f4"
        fontFamily="Space Grotesk, sans-serif"
        fontSize="14"
        fontWeight="700"
        letterSpacing="0.02em"
      >
        CYBERADSPACE
      </text>
      <text
        x="72"
        y="32"
        fill="#8a8a87"
        fontFamily="JetBrains Mono, monospace"
        fontSize="8"
        letterSpacing="0.35em"
      >
        F I L M S
      </text>
    </svg>
  );
}

export default function Home() {
  return (
    <>
      {/* NAV */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-10 py-5"
        style={{
          background:
            "linear-gradient(to bottom, rgba(5,5,5,0.85), rgba(5,5,5,0.0))",
          backdropFilter: "blur(6px)",
        }}
      >
        <a href="#top" aria-label="CyberAdSpace home" className="block">
          <Wordmark className="h-8 w-auto" />
        </a>
        <div className="hidden md:flex items-center gap-8">
          <a href="#films" className="nav-link">
            Films
          </a>
          <a href="#universe" className="nav-link">
            Universe
          </a>
          <a href="#studio" className="nav-link">
            Studio
          </a>
          <a href="#notify" className="nav-link">
            Notify
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section
        id="top"
        className="relative min-h-screen w-full flex flex-col justify-end overflow-hidden"
      >
        <video
          className="hero-video"
          autoPlay
          muted
          loop
          playsInline
          poster="/assets/poster-03-driver.png"
        >
          <source src="/assets/hero-video.mp4" type="video/mp4" />
        </video>
        <div className="scanlines" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(5,5,5,0.4) 0%, transparent 30%, transparent 55%, rgba(5,5,5,0.85) 100%)",
          }}
        />

        <div className="relative z-10 px-6 md:px-10 pb-20 md:pb-28 max-w-6xl">
          <div className="eyebrow mb-6">
            CyberAdSpace Films · Coming 2026
          </div>
          <h1 className="display text-white leading-[0.95] font-bold text-[44px] sm:text-[64px] md:text-[88px] lg:text-[112px] max-w-5xl">
            Five short films.
            <br />
            <span style={{ color: "var(--accent)" }}>One connected week.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg md:text-xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            A Florida cinematic anthology. Ten brands. One neighborhood. Nobody
            explains anything.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a href="#notify" className="btn btn-primary">
              Notify Me
            </a>
            <a href="#films" className="btn">
              See the Films
            </a>
          </div>
        </div>

        {/* scroll cue */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 mono text-[10px] tracking-[0.3em]" style={{ color: "var(--text-faint)" }}>
          ↓  SCROLL
        </div>
      </section>

      {/* FILMS */}
      <section id="films" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-16 md:mb-20">
            <div className="eyebrow mb-4">The Anthology</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] max-w-3xl">
              Watch them in any order.
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                They add up either way.
              </span>
            </h2>
            <p
              className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed"
              style={{ color: "var(--text-muted)" }}
            >
              Five short films, two to three minutes each. Real houses, real
              breakrooms, real Florida strip malls. Products live where they'd
              actually live — a can in a fridge, a bread on a counter, a bottle
              in a glovebox — and the story keeps moving.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FILMS.map((film, i) => (
              <article
                key={film.id}
                className="reveal poster group"
                style={{ transitionDelay: `${i * 80}ms` }}
              >
                <Image
                  src={film.poster}
                  alt={`${film.title} — CyberAdSpace short film`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                  priority={i < 2}
                />
                <div className="poster-meta">
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] tracking-[0.25em]" style={{ color: "var(--accent)" }}>
                      NO. {film.id}
                    </span>
                    <span className="mono text-[10px] tracking-[0.2em]" style={{ color: "var(--text-muted)" }}>
                      {film.runtime}
                    </span>
                  </div>
                  <div>
                    <h3 className="display text-white font-bold text-2xl md:text-3xl leading-tight mb-2">
                      {film.title}
                    </h3>
                    <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-muted)" }}>
                      {film.logline}
                    </p>
                    <div className="mono text-[9px] tracking-[0.25em]" style={{ color: "var(--text-faint)" }}>
                      {film.brands.join(" · ").toUpperCase()}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-16 text-center reveal">
            <div className="mono text-[11px] tracking-[0.3em]" style={{ color: "var(--text-faint)" }}>
              THE COMBINED FEATURE
            </div>
            <div className="display text-white font-bold text-3xl md:text-5xl mt-3">
              "The Week"
            </div>
            <div className="mono text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              ~13 min · assembled from all five
            </div>
          </div>
        </div>
      </section>

      {/* UNIVERSE / ECOSYSTEM STRIP */}
      <section id="universe" className="relative py-20 md:py-24 border-t border-b overflow-hidden" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 mb-10">
          <div className="reveal">
            <div className="eyebrow mb-4">The Universe</div>
            <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[0.95] max-w-3xl">
              Ten brands. One neighborhood.
            </h2>
            <p className="mt-6 max-w-2xl text-base md:text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
              Every product in every film is a real thing you can buy. No
              parody. No placeholder. If a character opens a fridge, that can
              is on a shelf somewhere in Florida.
            </p>
          </div>
        </div>

        <div className="relative w-full overflow-hidden">
          <div className="marquee-track flex whitespace-nowrap">
            {[...ECOSYSTEM, ...ECOSYSTEM].map((brand, i) => (
              <span
                key={i}
                className="display font-bold text-4xl md:text-6xl mx-8 md:mx-14"
                style={{
                  color: i % 3 === 0 ? "var(--accent)" : "var(--text)",
                  opacity: i % 3 === 0 ? 1 : 0.55,
                }}
              >
                {brand}
                <span className="mx-8 md:mx-14" style={{ color: "var(--text-faint)" }}>·</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT THE STUDIO */}
      <section id="studio" className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-4xl mx-auto">
          <div className="reveal">
            <div className="eyebrow mb-6">About the Studio</div>
            <h2 className="display text-white font-bold text-3xl md:text-5xl leading-[1.05] mb-10">
              CyberAdSpace is a small Florida studio that makes short films
              about the brands it also owns.
            </h2>
          </div>
          <div className="reveal grid md:grid-cols-2 gap-10 md:gap-14 text-base md:text-lg leading-relaxed" style={{ color: "var(--text-muted)" }}>
            <p>
              We started in a delivery truck. The idea was simple: people pay
              to advertise while we drive. Then the trucks started telling
              stories. Then the stories started sharing characters. Then the
              characters started sharing houses.
            </p>
            <p>
              Now we make Portlandia-meets-Barry-meets-Apple-Christmas-ad
              shorts, two or three minutes each, set in the same fictional
              strip-mall town. Every product in every film is one of our
              brands. Nobody ever explains anything. The camera just watches.
            </p>
          </div>

          <div className="hairline mt-16 mb-16" />

          <div className="reveal grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-6">
            {[
              { n: "5", l: "Short films" },
              { n: "10", l: "Brands" },
              { n: "13", l: "Minutes total" },
              { n: "2026", l: "Coming" },
            ].map((s) => (
              <div key={s.l}>
                <div className="display text-white font-bold text-5xl md:text-6xl" style={{ color: "var(--accent)" }}>
                  {s.n}
                </div>
                <div className="mono text-[10px] tracking-[0.25em] mt-2" style={{ color: "var(--text-muted)" }}>
                  {s.l.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* NOTIFY */}
      <section id="notify" className="relative py-24 md:py-32 px-6 md:px-10 border-t" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="reveal">
            <div className="eyebrow mb-6">Coming 2026</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] mb-6">
              Be the first to see them.
            </h2>
            <p className="text-base md:text-lg mb-10 max-w-xl mx-auto leading-relaxed" style={{ color: "var(--text-muted)" }}>
              One email when the first short drops. Then one more when the
              rest arrive. That's it.
            </p>
          </div>

          <NotifyForm />
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t py-14 px-6 md:px-10" style={{ borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Wordmark className="h-8 w-auto" />
          <div className="mono text-[10px] tracking-[0.25em] text-center" style={{ color: "var(--text-faint)" }}>
            © 2026 CYBERADSPACE FILMS · MADE IN FLORIDA
          </div>
          <div className="flex gap-6">
            <a href="#films" className="nav-link">Films</a>
            <a href="#studio" className="nav-link">Studio</a>
            <a href="#notify" className="nav-link">Notify</a>
          </div>
        </div>
      </footer>

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
            }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
            document.querySelectorAll('.reveal').forEach((el) => obs.observe(el));
          } else {
            document.querySelectorAll('.reveal').forEach((el) => el.classList.add('in'));
          }
        `}
      </Script>
    </>
  );
}
