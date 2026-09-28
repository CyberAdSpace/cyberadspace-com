import Image from "next/image";
import { BRANDS } from "@/data/brands";
import ProjectInquiry from "./_components/ProjectInquiry";

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

const PROCESS = [
  ["Tell us the idea.", "Your business, your audience, what you need, and where you want to go. Bring a rough concept or an existing brand."],
  ["Define the project.", "We agree on the deliverables, budget, timeline, and what is needed to launch before the build begins."],
  ["Create. Review. Refine.", "AI helps us explore and build. Human direction and your feedback shape what makes it into the finished project."],
  ["Get ready to launch.", "Review the website on desktop and mobile, finalize the content, and work through domain, hosting, and handoff details."],
];

export default function Home() {
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
            <a href="#contact" className="btn btn-primary">Start your project <span aria-hidden>↗</span></a>
            <a href="#brands" className="text-link">Explore our brands <span aria-hidden>↓</span></a>
          </div>
          <p className="hero-footnote">New businesses. Existing brands. Your next chapter.</p>
        </div>
        <div className="hero-work" aria-label="A selection of brands created by CyberAdSpace">
          <div className="work-heading mono"><span>Ideas we brought to life</span><span aria-hidden>↗</span></div>
          <a href="https://antriasacademy.com" target="_blank" rel="noopener noreferrer" className="work-feature">
            <div className="work-image">
              <Image src="/assets/logos/logo-antrias-academy.png" alt="Antria's Academy" width={340} height={160} priority />
            </div>
            <div className="work-caption"><span>Antria&apos;s Academy</span><span>Education · Music <span aria-hidden>↗</span></span></div>
          </a>
          <div className="work-pair">
            <a href="https://thefaithvault.com" target="_blank" rel="noopener noreferrer">
              <Image src="/assets/logos/logo-faith-vault.png" alt="The Faith Vault" width={220} height={160} />
              <span>The Faith Vault <span aria-hidden>↗</span></span>
            </a>
            <a href="https://canamocafe.com" target="_blank" rel="noopener noreferrer">
              <Image src="/assets/logos/logo-canamo-cafe.png" alt="Cáñamo Café" width={220} height={160} />
              <span>Cáñamo Café <span aria-hidden>↗</span></span>
            </a>
          </div>
          <div className="work-note mono">Our own brands. Your project could be next.</div>
        </div>
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
        <div className="scope-note"><span className="mono">Built around your brief.</span><p>Deliverables, pricing, integrations, and ongoing support are scoped for your project. No one-size-fits-all package.</p></div>
      </section>

      <section id="brands" className="portfolio-section section-space">
        <div className="site-shell">
          <div className="section-intro">
            <div><div className="eyebrow">The CyberAdSpace portfolio</div><h2 className="display">We built our brands.<br /><span>Now let&apos;s build yours.</span></h2></div>
            <p>Explore {BRANDS.length} brands we&apos;ve created across faith, music, education, food, and wellness. Most of these are brands we built and own. One was built for a partner. Visit each brand to see more.</p>
          </div>
          <div className="float-grid creation-portfolio">
            {BRANDS.map((brand, i) => (
              <article key={brand.slug} className="float-brand" style={{ "--brand-accent": brand.accent, "--float-delay": `${(i % 5) * 0.9}s` } as React.CSSProperties}>
                <a href={brand.url} target="_blank" rel="noopener noreferrer" className="float-brand-link">
                  <span className="float-brand-logo">
                    <Image src={brand.logo} alt={`${brand.name} logo`} width={340} height={160} className="float-brand-img" sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 22vw" />
                  </span>
                  <h3 className="brand-name">{brand.name}</h3>
                  <span className="brand-status mono">{brand.status}</span>
                  <span className="float-brand-tagline">{brand.tagline}</span>
                  <span className="brand-visit mono">Explore brand <span aria-hidden>↗</span></span>
                </a>
              </article>
            ))}
          </div>
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
            <div className="contact-note"><span className="mono">A conversation, not a checkout.</span><p>We&apos;ll discuss scope and pricing before you commit to a project.</p></div>
          </div>
          <ProjectInquiry />
        </div>
      </section>

      <section className="site-shell faq-section">
        <div className="eyebrow">Before we build</div>
        <div className="faq-list">
          <details><summary>Can you work with my existing brand?</summary><p>Yes. You can start with an existing name, logo, or website. Tell us what should stay, what isn&apos;t working, and what you want to change.</p></details>
          <details><summary>Do I need a full brand and a website?</summary><p>No. We can discuss a brand project, a website project, or both. The scope should fit what your business actually needs.</p></details>
          <details><summary>How much does a project cost?</summary><p>Pricing depends on the deliverables, content, features, and complexity. Send a brief and any budget range you have in mind so we can discuss a suitable scope.</p></details>
          <details><summary>What happens after the website is built?</summary><p>Domain, hosting, handoff, and any ongoing updates are discussed as part of your scope. We&apos;ll clarify responsibilities and any third-party costs before launch.</p></details>
        </div>
      </section>
    </main>
  );
}
