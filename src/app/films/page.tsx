import Image from "next/image";
import Link from "next/link";
import Script from "next/script";

const FILMS = [
  {
    id: "01",
    title: "The Fridge",
    runtime: "2:30",
    logline:
      "A night-shift nurse comes home to a couch, a game she doesn't care about, and a fridge full of small mercies.",
    brands: ["Palm Polish", "The Green Oven", "Canamo Cafe"],
    poster: "/assets/poster-01-fridge.png",
  },
  {
    id: "02",
    title: "Deej's Song",
    runtime: "2:15",
    logline:
      "A clinic breakroom, two chairs, and a demo that took eight months to record.",
    brands: ["Elevated Remedies", "Religion Relief", "Antria's Academy"],
    poster: "/assets/poster-02-deej.png",
  },
  {
    id: "03",
    title: "The Driver",
    runtime: "2:45",
    logline:
      "The only character you meet all week. He does not sell anything. He delivers.",
    brands: ["Williams Produce", "CyberAdSpace"],
    poster: "/assets/poster-03-driver.png",
  },
  {
    id: "04",
    title: "Sunday",
    runtime: "2:30",
    logline:
      "One house, two rituals, and a phone that keeps buzzing on the counter.",
    brands: ["The Faith Vault", "The Hemp Dispensary"],
    poster: "/assets/poster-04-sunday.png",
  },
  {
    id: "05",
    title: "Anniversary",
    runtime: "3:00",
    logline:
      "A detailed car, a locked bedroom door, and a whole week catching up with itself.",
    brands: ["Palm Polish", "LustLine", "Full Cast"],
    poster: "/assets/poster-05-anniversary.png",
  },
];

export const metadata = {
  title: "Films — CyberAdSpace Anthology · Coming 2026",
  description:
    "Five short films. One connected week. A Florida cinematic anthology from CyberAdSpace featuring all ten brands. In production for 2026.",
};

export default function FilmsPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[75vh] w-full flex flex-col justify-end overflow-hidden">
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
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(4,6,13,0.5) 0%, transparent 30%, transparent 55%, rgba(4,6,13,0.95) 100%)",
          }}
        />
        <div className="relative z-10 px-6 md:px-10 pb-16 md:pb-24 max-w-6xl">
          <Link
            href="/"
            className="mono text-[10px] tracking-[0.3em] inline-flex items-center gap-2 mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            <span aria-hidden>←</span> BACK TO MARKETPLACE
          </Link>
          <div className="eyebrow mb-6">
            CyberAdSpace Films · In Production 2026
          </div>
          <h1 className="display text-white leading-[0.95] font-bold text-[44px] sm:text-[64px] md:text-[88px] lg:text-[104px] max-w-5xl">
            Five short films.
            <br />
            <span style={{ color: "var(--accent)" }}>One connected week.</span>
          </h1>
          <p
            className="mt-8 max-w-xl text-lg md:text-xl leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            An anthology where every product is one of our brands. Nobody
            explains anything.
          </p>
        </div>
      </section>

      {/* FILMS GRID */}
      <section className="relative py-24 md:py-32 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-16">
            <div className="eyebrow mb-4">The Anthology</div>
            <h2 className="display text-white font-bold text-4xl md:text-6xl leading-[0.95] max-w-3xl">
              Watch them in any order.
              <br />
              <span style={{ color: "var(--text-muted)" }}>
                They add up either way.
              </span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {FILMS.map((film, i) => (
              <article
                key={film.id}
                className="reveal poster"
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <Image
                  src={film.poster}
                  alt={film.title}
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
              &ldquo;The Week&rdquo;
            </div>
            <div className="mono text-xs mt-3" style={{ color: "var(--text-muted)" }}>
              ~13 min · assembled from all five
            </div>

            <Link href="/#notify" className="btn btn-primary mt-10">
              Notify Me When They Drop
            </Link>
          </div>
        </div>
      </section>

      <Script id="reveal-films" strategy="afterInteractive">
        {`
          if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
            const obs = new IntersectionObserver((entries) => {
              entries.forEach((e) => {
                if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target); }
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
