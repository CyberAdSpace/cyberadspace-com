import Link from "next/link";
import AgentArcade from "../../_components/AgentArcade";
import MoonBase from "../../_components/station/MoonBase";

export const metadata = {
  title: "Agents at Work | CyberAdSpace",
  description: "Explore the Cyber Ad Space moon base: every brand in its dome, and the AI agents that build new brands, working live.",
};

export default function LivePage() {
  return (
    <main id="main-content" className="site-shell section-space live-page">
      <div className="eyebrow">Agents at work</div>
      <h1 className="display admin-title">The Cyber Ad Space moon base</h1>
      <p className="start-lede">Every brand we&apos;ve built lives in a dome on the base. The Brand Factory in the center is where seven agents build new brands for customers, and their status comes from real orders. Tap a dome to see its brands, or tap an agent to see what it&apos;s doing.</p>
      <MoonBase />
      <section id="factory-floor" className="factory-floor">
        <div className="eyebrow">Brand Factory floor</div>
        <h2 className="display admin-title">Watch the builds</h2>
        <p className="start-lede">Each row is a real paid order and each column is one agent&apos;s step. Customer names stay private, and a brand&apos;s name shows only after it&apos;s delivered.</p>
        <AgentArcade />
      </section>
      <p className="hero-actions"><Link href="/start" className="btn btn-primary">Start your brand</Link><span className="muted">Your order page shows your own build live.</span></p>
    </main>
  );
}
