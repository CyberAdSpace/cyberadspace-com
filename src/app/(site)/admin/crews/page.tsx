import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { aiConfigured } from "@/lib/ai";
import { allCrews, allProjects, storageReady } from "@/lib/crews";

export const dynamic = "force-dynamic";
export const metadata = { title: "Agent crews | CyberAdSpace", robots: { index: false, follow: false } };

const when = (s?: string) => (s ? new Date(s).toLocaleString("en-US", { timeZone: "America/New_York", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Not yet");

export default async function CrewsAdmin({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  if (!(await isAdmin())) redirect("/admin");
  const { msg } = await searchParams;
  const ready = storageReady();
  const [crews, projects] = ready ? await Promise.all([allCrews(), allProjects()]) : [[], []];
  const missing = projects.filter((p) => !crews.some((c) => c.project.slug === p.slug));
  const drafts = crews.flatMap((c) => c.outputs.filter((o) => o.status === "draft").map((o) => ({ c, o })));

  return (
    <main id="main-content" className="site-shell section-space admin-page">
      <div className="eyebrow"><Link href="/admin">Brand orders</Link> · Agent crews</div>
      <h1 className="display admin-title">Agent crews</h1>
      <p className="start-lede">Every project gets its own crew, designed by the system from the project&apos;s details. Site Watch checks each site daily. Writing agents draft weekly, and nothing they write shows on the moon base until you approve it here.</p>
      {msg && <p className="ok-note">{msg}</p>}
      {!ready && <p className="form-error">Storage isn&apos;t set up, so crews can&apos;t be saved.</p>}
      {!aiConfigured() && <p className="form-error">No OPENAI_API_KEY is set, so writing agents are on standby. Site Watch still runs. Add the key in Vercel → cyberadspace-com → Settings → Environment Variables, then redeploy.</p>}

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
                    <td>{a.cadence === "daily" ? "Daily" : "Weekly"}</td>
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
