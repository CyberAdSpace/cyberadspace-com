import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import { notFound } from "next/navigation";
import { BRANDS, getBrand } from "@/data/brands";
import AddToCart from "../_components/AddToCart";
import type { Metadata } from "next";

type PageParams = { brand: string };

export async function generateStaticParams(): Promise<PageParams[]> {
  return BRANDS.map((b) => ({ brand: b.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { brand: slug } = await params;
  const brand = getBrand(slug);
  if (!brand) return {};
  return {
    title: `${brand.name} — CyberAdSpace`,
    description: brand.tagline,
    openGraph: {
      title: `${brand.name} — CyberAdSpace`,
      description: brand.tagline,
      images: [brand.image],
    },
  };
}

export default async function BrandPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { brand: slug } = await params;
  const brand = getBrand(slug);
  if (!brand) notFound();

  // Suggest 3 other brands
  const others = BRANDS.filter((b) => b.slug !== brand.slug).slice(0, 3);

  return (
    <>
      {/* HERO */}
      <section className="relative min-h-[85vh] w-full flex flex-col justify-end overflow-hidden">
        <Image
          src={brand.image}
          alt={brand.name}
          fill
          priority
          sizes="100vw"
          className="hero-image object-cover"
        />
        <div className="scanlines" />
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(4,6,13,0.55) 0%, rgba(4,6,13,0.2) 30%, rgba(4,6,13,0.35) 55%, rgba(4,6,13,0.98) 100%)",
          }}
        />

        <div className="relative z-10 px-6 md:px-10 pb-16 md:pb-20 max-w-7xl w-full mx-auto">
          <Link
            href="/#brands"
            className="mono text-[10px] tracking-[0.3em] inline-flex items-center gap-2 mb-8"
            style={{ color: "var(--text-muted)" }}
          >
            <span aria-hidden>←</span> ALL BRANDS
          </Link>

          <div className="flex items-center gap-3 mb-6">
            <span className="pill" style={{ background: "rgba(4,6,13,0.6)" }}>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  color: brand.status === "live" ? "#7fd8be" : brand.accent,
                }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: brand.status === "live" ? "#7fd8be" : brand.accent,
                    boxShadow: `0 0 8px ${brand.status === "live" ? "#7fd8be" : brand.accent}`,
                  }}
                />
                {brand.status === "live" ? "SHOP OPEN" : "COMING SOON"}
              </span>
            </span>
            <span className="mono text-[10px] tracking-[0.28em]" style={{ color: brand.accent }}>
              {brand.category.toUpperCase()}
            </span>
          </div>

          <h1
            className="display font-bold text-5xl sm:text-7xl md:text-8xl leading-[0.92] max-w-5xl mb-6"
            style={{ color: "#fff" }}
          >
            {brand.name}
          </h1>
          <p
            className="max-w-2xl text-lg md:text-2xl leading-relaxed"
            style={{ color: "var(--text-muted)" }}
          >
            {brand.tagline}
          </p>

          {brand.shopUrl ? (
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={brand.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ background: brand.accent, borderColor: brand.accent }}
              >
                Shop {brand.name} <span aria-hidden>↗</span>
              </a>
              <a href="#catalog" className="btn">
                See the Catalog
              </a>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#catalog" className="btn btn-primary" style={{ background: brand.accent, borderColor: brand.accent }}>
                Preview the Catalog
              </a>
              <Link href="/#notify" className="btn">
                Notify Me When It Opens
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* STORY */}
      <section className="relative py-20 md:py-28 px-6 md:px-10">
        <div className="max-w-4xl mx-auto reveal">
          <div className="eyebrow mb-4" style={{ color: brand.accent }}>
            The Story
          </div>
          <p
            className="display text-white font-medium text-2xl md:text-4xl leading-[1.15]"
            style={{ letterSpacing: "-0.015em" }}
          >
            {brand.story}
          </p>
        </div>
      </section>

      {/* CATALOG */}
      <section
        id="catalog"
        className="relative py-20 md:py-28 px-6 md:px-10 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="reveal mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="eyebrow mb-3" style={{ color: brand.accent }}>
                {brand.productLabel}
              </div>
              <h2 className="display text-white font-bold text-3xl md:text-5xl">
                What&apos;s on offer.
              </h2>
            </div>
            {brand.shopUrl && (
              <a
                href={brand.shopUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mono text-[11px] tracking-[0.28em] self-start md:self-auto"
                style={{ color: brand.accent }}
              >
                FULL SHOP ↗
              </a>
            )}
          </div>

          <div className="reveal">
            {brand.products.map((p) => (
              <div key={p.name} className="product-row">
                <div>
                  <div className="display text-white font-semibold text-lg md:text-xl">
                    {p.name}
                  </div>
                  {p.note && (
                    <div
                      className="mono text-[10px] tracking-[0.2em] mt-1"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {p.note.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-6">
                  <div className="mono text-sm md:text-base" style={{ color: brand.accent }}>
                    {p.price}
                  </div>
                  <AddToCart
                    accent={brand.accent}
                    item={{
                      brand: brand.name,
                      brandSlug: brand.slug,
                      brandAccent: brand.accent,
                      name: p.name,
                      price: p.price,
                      shopUrl: brand.shopUrl,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {!brand.shopUrl && (
            <div
              className="reveal mt-14 p-6 md:p-8"
              style={{
                border: `1px solid ${brand.accent}40`,
                background: `${brand.accent}0a`,
                borderRadius: 4,
              }}
            >
              <div className="eyebrow mb-2" style={{ color: brand.accent }}>
                Coming Soon
              </div>
              <p className="text-base md:text-lg leading-relaxed" style={{ color: "var(--text)" }}>
                {brand.name} isn&apos;t open for orders yet. Add products to
                your manifest anyway — we&apos;ll email you the moment the
                shop goes live and pull your list forward.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* MORE FROM THE FAMILY */}
      <section
        className="relative py-20 md:py-28 px-6 md:px-10 border-t"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="max-w-7xl mx-auto">
          <div className="reveal mb-12">
            <div className="eyebrow mb-3">More From The Family</div>
            <h2 className="display text-white font-bold text-3xl md:text-4xl">
              Also on CyberAdSpace.
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            {others.map((b) => (
              <Link
                key={b.slug}
                href={`/${b.slug}`}
                className="reveal brand-tile group block"
                style={{ ["--brand-accent" as string]: b.accent + "80" } as React.CSSProperties}
              >
                <Image
                  src={b.image}
                  alt={b.name}
                  fill
                  sizes="(max-width: 640px) 100vw, 33vw"
                  className="object-cover"
                />
                <div className="brand-tile-content">
                  <div className="mono text-[9px] tracking-[0.28em] mb-1" style={{ color: b.accent }}>
                    {b.category.toUpperCase()}
                  </div>
                  <h3 className="display text-white font-bold text-xl leading-tight">
                    {b.name}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Script id="reveal-brand" strategy="afterInteractive">
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
