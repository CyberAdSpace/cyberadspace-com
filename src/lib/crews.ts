// Agent crews: every Cyber Ad Space project gets its own crew of agents, designed by the system.
// Studio brands come from src/data/brands.ts; client brands are delivered Brand Starter orders.
// Content agents write DRAFTS that a person approves before anything is shown publicly.
import { put, get } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BRANDS } from "@/data/brands";
import { aiConfigured, chatJSON } from "./ai";
import { blobConfigured, listOrders, out, type Kit, type NamesOut } from "./orders";
import { sendMail, siteUrl, STUDIO_INBOX } from "./mail";

export type Project = { slug: string; name: string; tagline: string; category: string; url: string; source: "studio" | "client" };

export type AgentKind = "sitecheck" | "social" | "devotional" | "songwriter" | "explainer" | "outreach" | "products" | "local";

export type CrewAgent = {
  id: string;
  kind: AgentKind;
  name: string;
  job: string;
  cadence: "daily" | "weekly";
  day?: number; // weekly: 0 = Sunday
  usesAI: boolean;
  lastRunAt?: string;
  nextRunAt: string;
  runningSince?: string;
  standby?: string; // why it can't run right now
};

export type Output = {
  id: string;
  agentId: string;
  at: string;
  title: string;
  body: string;
  status: "draft" | "approved" | "rejected" | "auto";
};

export type Crew = { project: Project; createdAt: string; designVersion: number; agents: CrewAgent[]; outputs: Output[] };

const DESIGN_VERSION = 1;
const PREFIX = "crews/";
const LOCAL = () => process.env.LOCAL_STORE_DIR;
const RUN_HOUR_UTC = 13; // 9 a.m. Eastern (daylight time)

// ---------- storage ----------
async function readCrew(slug: string): Promise<Crew | null> {
  const p = `${PREFIX}${slug}.json`;
  try {
    if (LOCAL()) { const b = await fs.readFile(path.join(LOCAL()!, p)).catch(() => null); return b ? JSON.parse(b.toString("utf8")) : null; }
    const res = await get(p, { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text()) as Crew;
  } catch { return null; }
}

async function saveCrew(c: Crew) {
  const p = `${PREFIX}${c.project.slug}.json`;
  const data = JSON.stringify(c);
  if (LOCAL()) { const f = path.join(LOCAL()!, p); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data); return; }
  await put(p, data, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

export function storageReady() { return blobConfigured(); }

// ---------- projects ----------
export async function allProjects(): Promise<Project[]> {
  const studio: Project[] = BRANDS.map((b) => ({ slug: b.slug, name: b.name, tagline: b.tagline, category: b.category, url: b.url, source: "studio" }));
  let clients: Project[] = [];
  if (blobConfigured()) {
    const orders = await listOrders().catch(() => []);
    clients = orders
      .filter((o) => o.slug && o.history.some((h) => h.event === "Delivered to customer"))
      .map((o) => ({
        slug: `client-${o.slug}`,
        name: out<NamesOut>(o, "names")?.selected ?? "Client brand",
        tagline: out<Kit>(o, "kit")?.tagline ?? "",
        category: "Client brand",
        url: `${siteUrl()}/b/${o.slug}`,
        source: "client" as const,
      }));
  }
  return [...studio, ...clients];
}

// ---------- crew design ----------
function specialist(p: Project): { kind: AgentKind; name: string; job: string } {
  const c = `${p.category} ${p.name}`.toLowerCase();
  if (/music|song|beat|record|worship/.test(c)) return { kind: "songwriter", name: "Songwriter", job: "Drafts a weekly song concept, hook and lyric starter in the brand's style" };
  if (/faith|scripture|sacred|church/.test(c)) return { kind: "devotional", name: "Devotional Writer", job: "Drafts a weekly reflection post for the brand's audience" };
  if (/civic|history|tax|union|policy/.test(c)) return { kind: "explainer", name: "Explainer", job: "Drafts a weekly explainer outline, with sources a person must check" };
  if (/market|vendor|booking/.test(c)) return { kind: "outreach", name: "Outreach Writer", job: "Drafts a weekly message to recruit vendors or partners" };
  if (/food|café|cafe|edible|cannabis|hemp|cookie/.test(c)) return { kind: "products", name: "Product Writer", job: "Drafts product copy and flags anything that sounds like a health claim" };
  if (/home|solar|pool|real estate|property/.test(c)) return { kind: "local", name: "Local Writer", job: "Drafts a weekly local post for Hernando, Pasco and Citrus County homeowners" };
  return { kind: "explainer", name: "Explainer", job: "Drafts a weekly explainer outline, with sources a person must check" };
}

/** The system designs a crew from the project's own details. */
export function designCrew(p: Project, now = new Date()): Crew {
  const sp = specialist(p);
  const due = now.toISOString(); // first run is due right away
  const agents: CrewAgent[] = [
    { id: "sitecheck", kind: "sitecheck", name: "Site Watch", job: "Checks every day that the site is up and how fast it loads", cadence: "daily", usesAI: false, nextRunAt: due },
    { id: "social", kind: "social", name: "Social Writer", job: "Drafts three social posts each week in the brand's voice", cadence: "weekly", day: 1, usesAI: true, nextRunAt: due },
    { id: sp.kind, kind: sp.kind, name: sp.name, job: sp.job, cadence: "weekly", day: 4, usesAI: true, nextRunAt: due },
  ];
  return { project: p, createdAt: now.toISOString(), designVersion: DESIGN_VERSION, agents, outputs: [] };
}

/** Send every project through the system: create crews that don't exist yet, refresh project details on the rest. */
export async function ensureCrews(): Promise<{ created: string[]; total: number }> {
  const projects = await allProjects();
  const created: string[] = [];
  for (const p of projects) {
    const c = await readCrew(p.slug);
    if (!c) { await saveCrew(designCrew(p)); created.push(p.name); }
    else if (JSON.stringify(c.project) !== JSON.stringify(p)) { c.project = p; await saveCrew(c); }
  }
  return { created, total: projects.length };
}

export async function allCrews(): Promise<Crew[]> {
  const projects = await allProjects();
  const crews = await Promise.all(projects.map((p) => readCrew(p.slug)));
  return crews.filter((c): c is Crew => Boolean(c));
}

// ---------- scheduling ----------
function nextRun(a: CrewAgent, from = new Date()): string {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), RUN_HOUR_UTC));
  if (d <= from) d.setUTCDate(d.getUTCDate() + 1);
  if (a.cadence === "weekly") while (d.getUTCDay() !== (a.day ?? 1)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

// ---------- running ----------
const RULES = `Rules: Write in plain, warm, specific language. Never invent facts, statistics, reviews, testimonials, prices or customer names. Never make health or medical claims. Never copy lyrics, other brands' slogans or anyone's work. If something needs checking, say so. This is a DRAFT for a person to review before anything is published.`;

function brief(p: Project) {
  return `Brand: ${p.name}\nTagline: ${p.tagline || "(none)"}\nCategory: ${p.category}\nWebsite: ${p.url}`;
}

const PROMPTS: Record<Exclude<AgentKind, "sitecheck">, string> = {
  social: "Write three short social media posts for this brand: one for Instagram, one for Facebook, one for X. Each under 60 words, with 2-4 relevant hashtags. Return {\"title\": string, \"body\": string} where body lists the three posts clearly labeled.",
  devotional: "Write one short, respectful reflection post (under 150 words) that fits this faith brand's audience, without quoting copyrighted translations at length. Return {\"title\": string, \"body\": string}.",
  songwriter: "Draft an original song concept for this brand: a title, a one-line theme, a 2-line hook and an 8-line verse starter. Everything must be original. Return {\"title\": string, \"body\": string}.",
  explainer: "Draft an outline for one new explainer article that fits this brand: a headline, 4-6 section points, and a list of the official sources a person should check before publishing. Return {\"title\": string, \"body\": string}.",
  outreach: "Draft one short outreach message (under 140 words) inviting a local vendor or partner to join this marketplace. Be clear about what they get; no promises about income. Return {\"title\": string, \"body\": string}.",
  products: "Draft a short brand or product description (under 120 words) for this brand, then a 'Compliance check' line listing any words a reviewer should double-check for health claims or legal limits. Return {\"title\": string, \"body\": string}.",
  local: "Draft one local social post (under 100 words) for homeowners in Hernando, Pasco and Citrus County, Florida, that fits this brand. Return {\"title\": string, \"body\": string}.",
};

async function runSiteCheck(p: Project): Promise<Output> {
  const t0 = Date.now();
  let title: string, body: string;
  try {
    const res = await fetch(p.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "CyberAdSpace Site Watch" } });
    const ms = Date.now() - t0;
    title = res.ok ? `Site up · ${ms} ms` : `Site returned ${res.status}`;
    body = `${p.url} answered with status ${res.status} in ${ms} ms.`;
  } catch (e) {
    title = "Site unreachable";
    body = `${p.url} didn't answer: ${e instanceof Error ? e.message : String(e)}`;
  }
  return { id: crypto.randomBytes(6).toString("hex"), agentId: "sitecheck", at: new Date().toISOString(), title, body, status: "auto" };
}

async function runContent(p: Project, a: CrewAgent): Promise<Output> {
  const r = await chatJSON<{ title?: string; body?: string }>(`You are the ${a.name} agent for a small brand built by Cyber Ad Space. Your job: ${a.job}.\n${RULES}`, `${brief(p)}\n\n${PROMPTS[a.kind as Exclude<AgentKind, "sitecheck">]}\n\nThe "title" must be a short label of 8 words or fewer. Put all the writing in "body".`);
  return { id: crypto.randomBytes(6).toString("hex"), agentId: a.id, at: new Date().toISOString(), title: String(r.title || `${a.name} draft`).split(/\s+/).slice(0, 12).join(" ").slice(0, 90), body: String(r.body || "").slice(0, 4000), status: "draft" };
}

function trimOutputs(c: Crew) {
  const checks = c.outputs.filter((o) => o.agentId === "sitecheck").slice(0, 7);
  const rest = c.outputs.filter((o) => o.agentId !== "sitecheck").slice(0, 30);
  c.outputs = [...checks, ...rest].sort((a, b) => b.at.localeCompare(a.at));
}

async function markRunning(slug: string, agentId: string, on: boolean) {
  const c = await readCrew(slug); if (!c) return;
  const a = c.agents.find((x) => x.id === agentId); if (!a) return;
  a.runningSince = on ? new Date().toISOString() : undefined;
  await saveCrew(c);
}

/** Run one agent now and record its output. */
export async function runAgent(slug: string, agentId: string): Promise<Output | null> {
  let c = await readCrew(slug); if (!c) return null;
  const a = c.agents.find((x) => x.id === agentId); if (!a) return null;
  if (a.usesAI && !aiConfigured()) {
    a.standby = "Waiting for an AI key"; await saveCrew(c); return null;
  }
  await markRunning(slug, agentId, true);
  let o: Output | null = null;
  try {
    o = a.kind === "sitecheck" ? await runSiteCheck(c.project) : await runContent(c.project, a);
  } catch (e) {
    o = { id: crypto.randomBytes(6).toString("hex"), agentId, at: new Date().toISOString(), title: `${a.name} hit a problem`, body: e instanceof Error ? e.message : String(e), status: "rejected" };
  }
  c = (await readCrew(slug))!;
  const a2 = c.agents.find((x) => x.id === agentId)!;
  a2.runningSince = undefined; a2.standby = undefined; a2.lastRunAt = new Date().toISOString(); a2.nextRunAt = nextRun(a2);
  c.outputs.unshift(o); trimOutputs(c);
  await saveCrew(c);
  return o;
}

/** Run every agent that's due. Agents that have never produced work count as due.
 *  Each project's agents run one after another (they share one file); projects run in parallel. */
export async function runDue(maxContent = 40, onlyChecks = false): Promise<{ ran: number; drafts: { project: string; agent: string; title: string }[]; waiting: number }> {
  const now = Date.now();
  const crews = await allCrews();
  const checks: Promise<unknown>[] = [];
  const byProject = new Map<string, { slug: string; project: string; agents: CrewAgent[] }>();
  let queued = 0;
  for (const c of crews) for (const a of c.agents) {
    const due = Date.parse(a.nextRunAt) <= now || (a.usesAI && !a.lastRunAt);
    if (!due) continue;
    if (a.kind === "sitecheck") { checks.push(runAgent(c.project.slug, a.id)); continue; }
    if (onlyChecks || !aiConfigured() || queued >= maxContent) continue;
    queued++;
    const g = byProject.get(c.project.slug) ?? { slug: c.project.slug, project: c.project.name, agents: [] };
    g.agents.push(a); byProject.set(c.project.slug, g);
  }
  const drafts: { project: string; agent: string; title: string }[] = [];
  let ran = 0;
  const groups = [...byProject.values()];
  const worker = async () => {
    for (let g = groups.shift(); g; g = groups.shift()) {
      for (const a of g.agents) {
        const o = await runAgent(g.slug, a.id);
        if (o) { ran++; if (o.status === "draft") drafts.push({ project: g.project, agent: a.name, title: o.title }); }
      }
    }
  };
  await Promise.all([Promise.all(checks), ...Array.from({ length: 6 }, worker)]);
  ran += checks.length;
  if (drafts.length) {
    await sendMail({
      to: STUDIO_INBOX,
      subject: `${drafts.length} new agent draft${drafts.length === 1 ? "" : "s"} to review`,
      text: `Your agents wrote ${drafts.length} new draft${drafts.length === 1 ? "" : "s"}:\n\n${drafts.map((d) => `- ${d.project}: ${d.agent}, "${d.title}"`).join("\n")}\n\nReview them here: ${siteUrl()}/admin/crews\n\nNothing is shown publicly until you approve it.`,
    }).catch(() => undefined);
  }
  const total = crews.reduce((n, c) => n + c.agents.filter((a) => a.usesAI && (Date.parse(a.nextRunAt) <= now || !a.lastRunAt)).length, 0);
  return { ran, drafts, waiting: Math.max(0, total - queued) };
}

export async function reviewOutput(slug: string, outputId: string, decision: "approved" | "rejected") {
  const c = await readCrew(slug); if (!c) return;
  const o = c.outputs.find((x) => x.id === outputId); if (!o || o.status === "auto") return;
  o.status = decision; await saveCrew(c);
}

// ---------- public view ----------
export type PublicAgentStatus = "working" | "idle" | "standby";
export type PublicCrew = {
  project: Project;
  agents: { id: string; name: string; job: string; cadence: string; status: PublicAgentStatus; note?: string; lastRunAt?: string }[];
  work: { agent: string; title: string; body: string; at: string }[];
};

export function toPublic(c: Crew): PublicCrew {
  const now = Date.now();
  return {
    project: c.project,
    agents: c.agents.map((a) => ({
      id: a.id, name: a.name, job: a.job,
      cadence: a.cadence === "daily" ? "Daily" : `Weekly, ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][a.day ?? 1]}`,
      status: a.runningSince && now - Date.parse(a.runningSince) < 5 * 60_000 ? "working" : a.usesAI && !aiConfigured() ? "standby" : "idle",
      note: a.usesAI && !aiConfigured() ? "Waiting for an AI key" : undefined,
      lastRunAt: a.lastRunAt,
    })),
    work: c.outputs
      .filter((o) => o.status === "approved" || o.status === "auto")
      .filter((o, i, all) => o.agentId !== "sitecheck" || all.findIndex((x) => x.agentId === "sitecheck") === i)
      .slice(0, 4)
      .map((o) => ({ agent: c.agents.find((a) => a.id === o.agentId)?.name ?? "Agent", title: o.title, body: o.body.slice(0, 600), at: o.at })),
  };
}

/** Drafts waiting for a person, for the review tools. */
export async function pendingDrafts() {
  const crews = await allCrews();
  return crews.flatMap((c) => c.outputs.filter((o) => o.status === "draft").map((o) => ({
    slug: c.project.slug, project: c.project.name, category: c.project.category, url: c.project.url,
    agent: c.agents.find((a) => a.id === o.agentId)?.name ?? o.agentId, id: o.id, at: o.at, title: o.title, body: o.body,
  })));
}
