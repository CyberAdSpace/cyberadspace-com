import Link from "next/link";
import { notFound } from "next/navigation";
import { journal, storageReady } from "@/lib/crews";

export const revalidate = 300;
const day = (s: string) => new Date(s).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });

async function find(slug: string, id: string) {
  if (!storageReady()) return null;
  return (await journal(slug)).find((p) => p.id === id) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const p = await find(slug, id);
  return p ? { title: `${p.title} | ${p.brand}`, description: p.body.replace(/^##\s.*$/gm, "").replace(/\s+/g, " ").trim().slice(0, 155) } : {};
}

export default async function Post({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const p = await find(slug, id);
  if (!p) notFound();
  const blocks = p.body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return (
    <main id="main-content" className="site-shell section-space journal-page">
      <div className="eyebrow"><Link href="/journal">Journal</Link> · <Link href={`/journal/${p.slug}`}>{p.brand}</Link></div>
      <article className="journal-post">
        <h1 className="display admin-title">{p.title}</h1>
        <p className="muted">{day(p.at)} · Written with AI assistance and reviewed by a person.</p>
        {blocks.map((b, i) => b.startsWith("## ") ? <h2 key={i}>{b.slice(3)}</h2> : <p key={i}>{b}</p>)}
        <p><a className="btn btn-primary" href={p.brandUrl} target="_blank" rel="noopener noreferrer">Visit {p.brand} ↗</a></p>
      </article>
    </main>
  );
}
