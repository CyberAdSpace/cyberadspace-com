// The agent engine: keeps crews working all day instead of once a morning.
// Every "tick" (from visitors watching the moon base / Planet CAS, the heartbeat, or cron):
//  - re-checks any site not checked in the last hour (free, no AI)
//  - runs ONE AI job: the most overdue scheduled agent, else continuous work
//    (AI Counsel studies every 30 min, Mini Me reviews every 3 hours).
// A global spacing (4 min) and a daily job budget keep costs bounded.
import { put, get } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import { aiConfigured } from "./ai";
import { allCrews, runAgent, CAS_SLUG, type Crew, type CrewAgent } from "./crews";

const FILE = "engine/state.json";
const LOCAL = () => process.env.LOCAL_STORE_DIR;
const SPACING_MS = 4 * 60_000;
const DAILY_AI_JOBS = () => Number(process.env.ENGINE_DAILY_JOBS || 150);
const CONTINUOUS: Record<string, number> = { counsel: 30 * 60_000, chief: 3 * 3600_000 }; // agent id on the CAS crew -> how often it works

export type EngineState = { lastTickAt?: string; day: string; aiJobs: number; lastJob?: { at: string; project: string; agent: string; title?: string }; ticks: number };

async function readState(): Promise<EngineState> {
  const blank = { day: "", aiJobs: 0, ticks: 0 };
  try {
    if (LOCAL()) { const b = await fs.readFile(path.join(LOCAL()!, FILE)).catch(() => null); return b ? JSON.parse(b.toString("utf8")) : blank; }
    const res = await get(FILE, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return blank;
    return JSON.parse(await new Response(res.stream).text());
  } catch { return blank; }
}
async function saveState(s: EngineState) {
  const data = JSON.stringify(s);
  if (LOCAL()) { const f = path.join(LOCAL()!, FILE); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data); return; }
  await put(FILE, data, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

export async function engineState() { return readState(); }

const SKIP = new Set(["chat", "audit", "books", "sitecheck"]);
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
const busy = (a: CrewAgent, now: number) => a.runningSince && now - Date.parse(a.runningSince) < 5 * 60_000;

function pickJob(crews: Crew[], now: number): { c: Crew; a: CrewAgent } | null {
  const due: { c: Crew; a: CrewAgent; at: number }[] = [];
  for (const c of crews) for (const a of c.agents) {
    if (SKIP.has(a.kind) || !a.usesAI || busy(a, now)) continue;
    const at = a.lastRunAt ? Date.parse(a.nextRunAt) : 0; // never-run agents go first
    if (at <= now) due.push({ c, a, at });
  }
  due.sort((x, y) => x.at - y.at);
  if (due.length) return due[0];
  const cas = crews.find((c) => c.project.slug === CAS_SLUG);
  if (!cas) return null;
  for (const [id, every] of Object.entries(CONTINUOUS)) {
    const a = cas.agents.find((x) => x.id === id);
    if (a && !busy(a, now) && (!a.lastRunAt || now - Date.parse(a.lastRunAt) >= every)) return { c: cas, a };
  }
  return null;
}

/** One engine tick. Safe to call often: it does nothing if another tick ran in the last 4 minutes. */
export async function tick(source: string): Promise<{ ran?: string; skipped?: string }> {
  const now = Date.now();
  const st = await readState();
  if (st.lastTickAt && now - Date.parse(st.lastTickAt) < SPACING_MS) return { skipped: "spacing" };
  if (st.day !== today()) { st.day = today(); st.aiJobs = 0; }
  st.lastTickAt = new Date(now).toISOString(); st.ticks = (st.ticks ?? 0) + 1;
  await saveState(st); // claim this tick before doing any work

  const crews = await allCrews();
  // free work: hourly site checks
  const stale = crews.flatMap((c) => c.agents.filter((a) => a.kind === "sitecheck" && !busy(a, now) && (!a.lastRunAt || now - Date.parse(a.lastRunAt) > 3600_000)).map((a) => runAgent(c.project.slug, a.id)));
  const checks = Promise.allSettled(stale);

  let ran: string | undefined;
  if (aiConfigured() && st.aiJobs < DAILY_AI_JOBS()) {
    const job = pickJob(crews, now);
    if (job) {
      const o = await runAgent(job.c.project.slug, job.a.id).catch(() => null);
      ran = `${job.c.project.name} · ${job.a.name}`;
      const s2 = await readState();
      s2.aiJobs = (s2.day === today() ? s2.aiJobs : 0) + 1; s2.day = today();
      s2.lastJob = { at: new Date().toISOString(), project: job.c.project.name, agent: job.a.name, title: o?.title };
      await saveState(s2);
    }
  }
  await checks;
  void source;
  return ran ? { ran } : { skipped: stale.length ? undefined : "nothing due" };
}
