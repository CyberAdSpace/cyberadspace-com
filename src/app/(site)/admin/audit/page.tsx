import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { latestAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Security audit | CyberAdSpace", robots: { index: false, follow: false } };

const when = (s: string) => new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const GRADE = { problem: "Problem", attention: "Needs attention", clear: "Clear" } as const;

export default async function AuditAdmin() {
  if (!(await isAdmin())) redirect("/admin");
  const r = await latestAudit();
  return (
    <main id="main-content" className="site-shell section-space admin-page">
      <div className="eyebrow"><Link href="/admin">Brand orders</Link> · <Link href="/admin/crews">Agent crews</Link> · Security audit</div>
      <h1 className="display admin-title">Security audit</h1>
      <p className="start-lede">The Security Auditor checks every site each morning at 8:35. It can&apos;t promise a site is 100% safe, but it catches what a person would miss: downtime, expiring certificates, broken links and files, forms that go nowhere, exposed private files, leaked keys and claims that don&apos;t match the fact sheets. Only a one-line summary is ever shown publicly.</p>
      {!r && <section className="admin-card"><p className="muted">No audit yet. It runs every morning, or from Agent crews → Security Auditor → Run now.</p></section>}
      {r && (
        <>
          <section className="admin-card">
            <h2>{when(r.at)}</h2>
            <p>{r.summary.sites} sites, {r.summary.pagesChecked} pages. <b>{r.summary.problem}</b> with problems, <b>{r.summary.attention}</b> needing attention, <b>{r.summary.clear}</b> clear.</p>
          </section>
          {r.sites.map((s) => (
            <section key={s.slug} className={`admin-card audit-site g-${s.grade}`}>
              <h2>{s.name} <small className="muted">· {GRADE[s.grade]}</small></h2>
              <p className="muted"><a href={s.url} target="_blank" rel="noopener noreferrer">{s.url}</a> · {s.pagesChecked} pages · {Math.round(s.ms / 1000)}s</p>
              <ul className="audit-checks">
                {s.checks.map((c) => <li key={c.id} className={`s-${c.status}`}><b>{c.status === "pass" ? "✓" : c.status === "info" ? "i" : c.status === "warn" ? "!" : "✕"} {c.label}</b> <span>{c.detail}</span></li>)}
              </ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
