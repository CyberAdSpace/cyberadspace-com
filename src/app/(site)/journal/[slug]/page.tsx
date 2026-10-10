import Link from "next/link";
import { notFound } from "next/navigation";
import { journal, storageReady } from "@/lib/crews";

export const revalidate = 300;
const day = (s: string) => new Date(s).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = storageReady() ? await journal(slug) : [];
  return { title: `${posts[0]?.brand ?? "Brand"} journal | CyberAdSpace` };
}

export default async function BrandJournal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = storageReady() ? await journal(slug) : [];
  if (!posts.length) notFound();
  return (
    <main id="main-content" className="site-shell section-space journal-page">
      <div className="eyebrow"><Link href="/journal">Journal</Link></div>
      <h1 className="display admin-title">{posts[0].brand}</h1>
      <p className="start-lede"><a href={posts[0].brandUrl} target="_blank" rel="noopener noreferrer">Visit {posts[0].brand} ↗</a></p>
      <ul className="journal-list">
        {posts.map((p) => <li key={p.id}><Link href={`/journal/${p.slug}/${p.id}`}><small>{day(p.at)}</small><b>{p.title}</b></Link></li>)}
      </ul>
    </main>
  );
}
