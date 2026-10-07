import Image from "next/image";
import { BRANDS } from "@/data/brands";
import Link from "next/link";
import ProjectInquiry from "../_components/ProjectInquiry";
import { PRICE_USD } from "@/lib/orders";
import { stripeConfigured } from "@/lib/stripe";
import { xprConfigured } from "@/lib/xpr";

const SERVICES = [
  {
    n: "01",
    title: "Build your brand.",
    text: "Starting with an idea? Give it a name, a recognizable identity, and a clear story. We use AI to explore possibilities, then shape a direction around your business.",
    items: ["Brand direction & naming", "Logos & visual identity", "Brand messaging"],
  },
  {
    n: "02",
    title: "Create your website.",
    text: "Turn that identity into a place people can find you, understand what you do, and take the next step. A new site or a fresh start for the one you already have.",
    items: ["Business websites & landing pages", "Mobile-ready design", "Content & launch setup"],
  },
  {
    n: "03",
    title: "Bring it all together.",
    text: "Need both? Build the brand and the website as one project, with consistent visuals and messaging from the first impression to the final page.",
    items: ["Brand + website projects", "AI-assisted images & copy", "Project-specific features"],
  },
];

const STARTER = [
  "5 brand name options, with a domain check and a basic trademark search",
  "Logo: main, icon, and black-and-white versions",
  "Brand kit: colors, fonts, tagline, and brand story",
  "One-page website, hosted for you",
  "Marketplace storefront with up to 5 products",
  "Launch kit: 5 social posts, profile image, and banner",
  "2 rounds of revisions, delivered within 72 hours of payment",
];

const CUSTOM = ["Multi-page websites", "Custom AI features, like a Q&A assistant", "Marketplaces and booking platforms", "Rebrands of an existing business"];

const PROCESS = [
  ["Tell us the idea.", "Your business, your audience, what you need, and where you want to go. Bring a rough concept or an existing brand."],
  ["Define the project.", "We agree on the deliverables, budget, timeline, and what is needed to launch before the build begins."],
  ["Create. Review. Refine.", "AI helps us explore and build. Human direction and your feedback shape what makes it into the finished project."],
  ["Get ready to launch.", "Review the website on desktop and mobile, finalize the content, and work through domain, hosting, and handoff details."],
];

export default function Home() {
  const card = stripeConfigured();
  const wallet = xprConfigured();
  const payNote = card && wallet ? "Pay by card or with your WebAuth wallet (XMD). " : card ? "Pay securely by card. " : wallet ? "Pay with your WebAuth wallet (XMD). " : "";
  return (
    <main id="main-content" className="creation-home">
      <section id="top" className="creation-hero site-shell">
        <div className="hero-copy">
          <div className="eyebrow">Your idea. Our next build.</div>
          <h1 className="display">
            We build<br />
            <span>brands &amp;<br />websites.</span>
          </h1>
          <p className="hero-line display">Powered by AI. Created for you.</p>
          <p className="hero-description">
            You bring the business idea. We help turn it into a brand people
            recognize and a website that makes it real.
          </p>
          <div className="hero-actions">
            <Link href="/start" className="btn btn-primary">Launch your brand · ${PRICE_USD} <span aria-hidden>↗</span></Link>
            <a href="#pricing" className="text-link">See what&apos;s included <span aria-hidden>↓</span></a>
          </div>
          <p className="hero-footnote">New businesses. Existing brands. Your next chapter.</p>
        </div>
        <aside id="brands" className="hero-brands" aria-label="Brands We've Created">
          <h2 className="hero-brands-title">Brands We&apos;ve Created</h2>
          <div className="hero-brands-scroll">
            <div className="float-grid creation-portfolio hero-brand-grid">
              {BRANDS.map((brand, i) => (
                <article key={brand.slug} className="float-brand" style={{ "--brand-accent": brand.accent, "--float-delay": `${(i % 5) * 0.9}s` } as React.CSSProperties}>
                  <a href={brand.url} target="_blank" rel="noopener noreferrer" className="float-brand-link">
                    <span className="float-brand-logo">
                      <Image src={brand.logo} alt={`${brand.name} logo`} width={340} height={160} className="float-brand-img" sizes="(max-width: 900px) 42vw, 18vw" />
                    </span>
                    <h3 className="brand-name">{brand.name}</h3>
                    <span className="float-brand-tagline">{brand.tagline}</span>
                    <span className="brand-visit mono">Explore brand <span aria-hidden>↗</span></span>
                  </a>
                </article>
              ))}
            </div>
          </div>
        </aside>
      </section>

      <div className="capability-strip">
        <div className="site-shell">
          <span>Brand creation</span><span aria-hidden>+</span>
          <span>Website development</span><span aria-hidden>+</span>
          <span>AI-powered creativity</span>
        </div>
      </div>

      <section id="services" className="site-shell section-space">
        <div className="section-intro">
          <div><div className="eyebrow">What we create</div><h2 className="display">From an idea<br />to an online presence.</h2></div>
          <p>You don&apos;t need to know which AI tools to use or how to build a website. Tell us what you want to create. We&apos;ll help shape the path.</p>
        </div>
        <div className="service-list">
          {SERVICES.map((service) => (
            <article key={service.n} className="service-row">
              <span className="service-number mono">{service.n}</span>
              <h3 className="display">{service.title}</h3>
              <div><p>{service.text}</p><ul>{service.items.map((item) => <li key={item}>{item}</li>)}</ul></div>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="site-shell section-space">
        <div className="section-intro">
          <div><div className="eyebrow">Pricing</div><h2 className="display">One flat price to launch.<br /><span>A fixed quote for anything bigger.</span></h2></div>
          <p>No hourly billing and no surprise invoices. You know the price before we start.</p>
        </div>
        <div className="price-grid">
          <article className="price-card price-card-main">
            <div className="mono price-label">Brand Starter</div>
            <div className="price-amount display">${PRICE_USD}<span>one time</span></div>
            <p className="price-lede">Everything a new business needs to look real and start selling.</p>
            <ul className="price-list">{STARTER.map((item) => <li key={item}>{item}</li>)}</ul>
            <Link href="/start" className="btn btn-primary">Launch your brand · ${PRICE_USD} <span aria-hidden>↗</span></Link>
            <p className="price-fine">{payNote}Domain not included (about $12–$20 a year). 3.5% fee only on sales made through the CyberAdSpace Marketplace.</p>
          </article>
          <article className="price-card">
            <div className="mono price-label">Custom builds</div>
            <div className="price-amount display price-quote">Quoted up front</div>
            <p className="price-lede">Bigger ideas get a fixed price in writing before any work begins.</p>
            <ul className="price-list">{CUSTOM.map((item) => <li key={item}>{item}</li>)}</ul>
            <a href="#contact" className="btn btn-ghost">Tell us your idea <span aria-hidden>↗</span></a>
          </article>
        </div>
      </section>

      <section id="operators" className="site-shell section-space">
        <div className="section-intro">
          <div><div className="eyebrow">Run one of our brands</div><h2 className="display">Have the drive<br /><span>but not the idea?</span></h2></div>
          <div className="operator-copy">
            <p>Some of the brands we build are looking for someone to run them. You take it over, operate it and keep the large majority of what it earns. We keep a small license fee for the brand, site and domain. Every arrangement is a private, written agreement with one operator.</p>
            <a className="btn btn-primary" href="mailto:Contact@CyberAdSpace.com?subject=Operator%20inquiry">Tell us which one interests you <span aria-hidden>↗</span></a>
          </div>
        </div>
      </section>

      <section id="process" className="site-shell section-space">
        <div className="section-intro">
          <div><div className="eyebrow">How we work</div><h2 className="display">AI in the process.<br />People in the decisions.</h2></div>
          <p>AI is a creative and development tool, not a replacement for understanding your business. We build around your goals and refine with your input.</p>
        </div>
        <ol className="process-list">
          {PROCESS.map(([title, text], i) => (
            <li key={title}><span className="mono">0{i + 1}</span><h3 className="display">{title}</h3><p>{text}</p></li>
          ))}
        </ol>
      </section>

      <section id="contact" className="contact-section section-space">
        <div className="site-shell contact-layout">
          <div className="contact-copy">
            <div className="eyebrow">Let&apos;s build something</div>
            <h2 className="display">What have you<br />got in mind?</h2>
            <p>A business you&apos;re ready to launch. A brand that needs a new look. A website that needs to work harder. Start with the idea.</p>
            <a className="contact-email" href="mailto:Contact@CyberAdSpace.com">Contact@CyberAdSpace.com <span aria-hidden>↗</span></a>
            <div className="contact-note"><span className="mono">Ready to launch?</span><p>The Brand Starter is ${PRICE_USD} and you can <Link href="/start">order it online</Link>. For anything bigger, tell us here and we&apos;ll send a fixed quote before you commit.</p></div>
          </div>
          <ProjectInquiry />
        </div>
      </section>

      <section className="site-shell faq-section">
        <div className="eyebrow">Before we build</div>
        <div className="faq-list">
          <details><summary>Can you work with my existing brand?</summary><p>Yes. You can start with an existing name, logo, or website. Tell us what should stay, what isn&apos;t working, and what you want to change.</p></details>
          <details><summary>Do I need a full brand and a website?</summary><p>No. We can discuss a brand project, a website project, or both. The scope should fit what your business actually needs.</p></details>
          <details><summary>How much does a project cost?</summary><p>The Brand Starter is ${PRICE_USD} flat: brand name, logo, brand kit, one-page website, marketplace storefront and launch kit. Bigger projects, like multi-page sites, custom AI features or marketplaces, get a fixed quote in writing before we begin.</p></details>
          <details><summary>What happens after the website is built?</summary><p>Domain, hosting, handoff, and any ongoing updates are discussed as part of your scope. We&apos;ll clarify responsibilities and any third-party costs before launch.</p></details>
        </div>
      </section>
    </main>
  );
}
