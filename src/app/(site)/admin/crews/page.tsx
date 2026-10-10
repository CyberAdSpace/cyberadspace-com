import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { aiConfigured } from "@/lib/ai";
import { allCrews, allProjects, storageReady } from "@/lib/crews";
import { readLibrary } from "@/lib/counsel";
import { engineState } from "@/lib/engine";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent crews | CyberAdSpace", robots: { index: false, follow: false } };

const when = (s?: string) => (s ? new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not yet");

export default async function CrewsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { msg } = await searchParams;
  const ready = storageReady();
  const [crews, projects] = ready ? await Promise.all([allCrews(), allProjects()]) : [[], []];
  const missing = projects.filter((p) => !crews.some((c) => c.project.slug === p.slug));
  const [lib, engine] = ready ? await Promise.all([readLibrary(), engineState()]) : [null, null];
  const cas = crews.find((c) => c.project.slug === "cyberadspace");
  const autopilot = cas?.autopilot !== false;
  const drafts = crews.flatMap((c) => c.outputs.filter((o) => o.status === "draft").map((o) => ({ c, o })));

  return (
    <main id="main-content" className="site-shell section-space admin-page">
      <div className="eyebrow"><Link href="/admin">Brand orders</Link> · Agent crews · <Link href="/admin/audit">Security audit</Link> · <Link href="/journal">Journal</Link></div>
      <h1 className="display admin-title">Agent crews</h1>
      <p className="start-lede">Every project gets its own crew, designed by the system from the project&apos;s details. Site Watch checks each site daily. Writing agents draft weekly, and nothing they write shows on the moon base until you approve it here.</p>
      {msg && <p className="ok-note">{msg}</p>}
      {!ready && <p className="form-error">Storage isn&apos;t set up, so crews can&apos;t be saved.</p>}
      {!aiConfigured() && <p className="form-error">No OPENAI_API_KEY is set, so writing agents are on standby. Site Watch still runs. Add the key in Vercel → cyberadspace-com → Settings → Environment Variables, then redeploy.</p>}

      {(() => {
        const brief = crews.find((c) => c.project.slug === "cyberadspace")?.outputs.find((o) => o.agentId === "chief");
        return (
          <section className="admin-card">
            <h2>Mini Me{brief ? ` · ${when(brief.at)}` : ""}</h2>
            <p className="muted">In charge of every agent. Thinks with your profile, checks each brand against the $1K/month bar, sends agents to work and marks every draft. You still make the final call.</p>
            {brief ? <pre className="crew-draft-pre">{brief.body}</pre> : <p className="muted">No brief yet. Mini Me runs first thing each morning.</p>}
            <form method="post" action="/api/admin/crews" className="hero-actions">
              <input type="hidden" name="slug" value="cyberadspace" />
              <input type="hidden" name="agent" value="chief" />
              <button className="btn btn-primary" name="action" value="run-one">Ask Mini Me for a brief now</button>
            </form>
          </section>
        );
      })()}

      <section className="admin-card">
        <h2>Engine</h2>
        <p className="muted">Agents work all day: every few minutes the engine runs the most overdue agent, AI Counsel studies every 30 minutes, Mini Me reviews every 3 hours, and every site is checked hourly. {engine?.lastJob ? `Last job: ${engine.lastJob.project} · ${engine.lastJob.agent}, ${when(engine.lastJob.at)}. ` : ""}{engine ? `${engine.aiJobs} AI jobs today.` : ""}</p>
        <form method="post" action="/api/admin/crews" className="hero-actions">
          <span className="muted">Autopilot is <b>{autopilot ? "on" : "off"}</b>: {autopilot ? "Mini Me publishes or rejects drafts itself." : "drafts wait for you."}</span>
          <button className="btn" name="action" value={autopilot ? "autopilot-off" : "autopilot-on"}>{autopilot ? "Turn autopilot off" : "Turn autopilot on"}</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>AI Counsel</h2>
        <p className="muted">The attorney agent. It learns the way attorneys do (statutes and regulations first, then agency guidance and court decisions, then new rules) and keeps a cited law library that every brand&apos;s agents follow. It isn&apos;t licensed, so it never presents itself to the public as a lawyer.</p>
        <form method="post" action="/api/admin/crews">
          <label className="muted" htmlFor="counsel-q">Ask a legal question about any brand</label>
          <textarea id="counsel-q" name="question" rows={3} style={{ width: "100%" }} placeholder="Can Cáñamo Café sell its CBD, CBG and CBN products after the federal hemp changes?" />
          <button className="btn btn-primary" name="action" value="ask-counsel">Ask AI Counsel</button>
        </form>
        {lib?.questions.slice(0, 5).map((q) => (
          <details key={q.id}><summary>{q.answer ? "Answered" : "Researching"} · {q.question.slice(0, 90)}</summary><pre className="crew-draft-pre">{q.answer ?? "Working on it."}</pre></details>
        ))}
        <h3>Law library</h3>
        {lib?.topics.map((t) => (
          <details key={t.key}><summary>{t.title} · {t.rules.length} rules · {t.lastStudiedAt ? `studied ${when(t.lastStudiedAt)}` : "not studied yet"}</summary>
            <pre className="crew-draft-pre">{t.rules.map((r) => `- ${r.rule}\n  [${r.citation}]${r.url ? ` ${r.url}` : ""}`).join("\n") || "Nothing yet."}{t.openIssues.length ? `\n\nStill open:\n${t.openIssues.map((x) => `- ${x}`).join("\n")}` : ""}</pre>
          </details>
        ))}
      </section>

      <section className="admin-card">
        <h2>Send projects through the system</h2>
        <p className="muted">{crews.length} of {projects.length} projects have crews.{missing.length ? ` Waiting: ${missing.map((p) => p.name).join(", ")}.` : ""} New studio brands and delivered client brands get crews automatically every morning.</p>
        <form method="post" action="/api/admin/crews" className="hero-actions">
          <button className="btn btn-primary" name="action" value="ensure">Create missing crews</button>
          <button className="btn" name="action" value="run-all">Run all due agents now</button>
        </form>
      </section>

      <section className="admin-card">
        <h2>Drafts to review ({drafts.length})</h2>
        {!drafts.length && <p className="muted">No drafts waiting.</p>}
        {drafts.map(({ c, o }) => (
          <article key={o.id} className="crew-draft">
            <p className="muted">{c.project.name} · {c.agents.find((a) => a.id === o.agentId)?.name} · {when(o.at)}</p>
            <h3>{o.title}</h3>
            {o.note && <p className="ok-note">{o.note}</p>}
            <pre>{o.body}</pre>
            <form method="post" action="/api/admin/crews" className="hero-actions">
              <input type="hidden" name="slug" value={c.project.slug} />
              <input type="hidden" name="output" value={o.id} />
              <button className="btn btn-primary" name="action" value="approve">Approve and show publicly</button>
              <button className="btn" name="action" value="reject">Reject</button>
            </form>
          </article>
        ))}
      </section>

      <section className="admin-card">
        <h2>Research &amp; plans</h2>
        <p className="muted">Brand Developers bring concept and pre-launch brands to life. Compliance Researchers check current law and the live site and propose safe wording. Both search the web and cite sources. Compliance memos are research, not legal advice. Only you see this section.</p>
        <form method="post" action="/api/admin/crews" className="hero-actions">
          <button className="btn btn-primary" name="action" value="run-research">Run all research agents now</button>
        </form>
        {crews.filter((c) => c.agents.some((a) => a.kind === "develop" || a.kind === "compliance")).map((c) => {
          const dev = c.outputs.find((o) => o.agentId === "develop");
          const law = c.outputs.find((o) => o.agentId === "compliance");
          const hasDev = c.agents.some((a) => a.kind === "develop");
          return (
            <article key={c.project.slug} className="crew-draft">
              <h3>{c.project.name}</h3>
              {hasDev && (dev ? <details><summary>Brand brief · {when(dev.at)}</summary><pre>{dev.body}</pre></details> : <p className="muted">Brand Developer hasn&apos;t run yet.</p>)}
              {c.agents.some((a) => a.kind === "compliance") && (law ? <details><summary>Compliance memo · {when(law.at)}</summary><pre>{law.body}</pre></details> : <p className="muted">Compliance Researcher hasn&apos;t run yet.</p>)}
              {c.rules?.length ? <p className="muted"><small>{c.rules.length} compliance rules are in force for this brand&apos;s writers.</small></p> : null}
              {hasDev && (
                <form method="post" action="/api/admin/crews">
                  <input type="hidden" name="slug" value={c.project.slug} />
                  <label className="muted" htmlFor={`notes-${c.project.slug}`}>Your answers and notes (treated as facts by every agent for this brand){c.ownerNotesAt ? ` · saved ${when(c.ownerNotesAt)}` : ""}</label>
                  <textarea id={`notes-${c.project.slug}`} name="notes" rows={5} defaultValue={c.ownerNotes ?? ""} style={{ width: "100%" }} />
                  <button className="btn" name="action" value="notes">Save answers</button>
                </form>
              )}
            </article>
          );
        })}
      </section>

      {(() => {
        const books = crews.find((c) => c.project.slug === "cyberadspace")?.outputs.find((o) => o.agentId === "books");
        return books ? (
          <section className="admin-card">
            <h2>Books ({when(books.at)})</h2>
            <pre className="crew-draft-pre">{books.body}</pre>
            <p className="muted">Private. Only you see this; it's also emailed each morning.</p>
          </section>
        ) : null;
      })()}

      <section className="admin-card">
        <h2>Crews</h2>
        <div className="crew-table-wrap">
          <table className="crew-table">
            <thead><tr><th>Project</th><th>Agent</th><th>Schedule</th><th>Last run</th><th>Next run</th><th>Latest</th><th /></tr></thead>
            <tbody>
              {crews.map((c) => c.agents.map((a, i) => {
                const latest = c.outputs.find((o) => o.agentId === a.id);
                return (
                  <tr key={c.project.slug + a.id}>
                    <td>{i === 0 ? <><b>{c.project.name}</b><br /><small>{c.project.source === "client" ? "Client brand" : c.project.category}</small></> : null}</td>
                    <td>{a.name}<br /><small>{a.job}</small></td>
                    <td>{a.cadence === "daily" ? "Daily" : a.cadence === "live" ? "Live" : "Weekly"}</td>
                    <td>{when(a.lastRunAt)}</td>
                    <td>{a.standby ? <small>{a.standby}</small> : when(a.nextRunAt)}</td>
                    <td><small>{latest ? `${latest.title} (${latest.status})` : "—"}</small></td>
                    <td>
                      <form method="post" action="/api/admin/crews">
                        <input type="hidden" name="slug" value={c.project.slug} />
                        <input type="hidden" name="agent" value={a.id} />
                        <button className="btn" name="action" value="run-one">Run now</button>
                      </form>
                    </td>
                  </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
