import Link from "next/link";
import AgentArcade from "../../_components/AgentArcade";

export const metadata = {
  title: "Agents at Work | CyberAdSpace",
  description: "Watch CyberAdSpace's AI agents build brands in real time: brief, names, brand kit, logo, website, storefront and launch kit.",
};

export default function LivePage() {
  return (
    <main id="main-content" className="site-shell section-space live-page">
      <div className="eyebrow">Agents at work</div>
      <h1 className="display admin-title">Watch the agents build</h1>
      <p className="start-lede">Seven agents build every Cyber Ad Space brand, one step each. Each row is a real paid order. When an agent finishes its step, that invader clears. Customer names stay private, and a brand&apos;s name shows only after it&apos;s delivered.</p>
      <AgentArcade />
      <p className="hero-actions"><Link href="/start" className="btn btn-primary">Start your brand</Link><span className="muted">Your order page shows your own build live.</span></p>
    </main>
  );
}
