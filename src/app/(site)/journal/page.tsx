import Link from "next/link";
import { journal, storageReady } from "@/lib/crews";

export const revalidate = 300;
export const metadata = { title: "Journal | CyberAdSpace", description: "Posts from the brands built by Cyber Ad Space, written with AI assistance and reviewed by a person." };

const day = (s: string) => new Date(s).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });

export default async function JournalIndex() {
  const posts = storageReady() ? await journal() : [];
  return (
    <main id="main-content" className="site-shell section-space journal-page">
      <div className="eyebrow">Journal</div>
      <h1 className="display admin-title">From our brands</h1>
      <p className="start-lede">Posts from the brands Cyber Ad Space builds. Each one is drafted by the brand&apos;s Blog Writer agent from the brand&apos;s own fact sheet and published only after a person approves it.</p>
      {!posts.length && <p className="muted">The first posts are being reviewed. Check back soon.</p>}
      <ul className="journal-list">
        {posts.map((p) => (
          <li key={p.id}><Link href={`/journal/${p.slug}/${p.id}`}><small>{p.brand} · {day(p.at)}</small><b>{p.title}</b><span>{p.body.replace(/^##\s.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 180)}…</span></Link></li>
        ))}
      </ul>
    </main>
  );
}
