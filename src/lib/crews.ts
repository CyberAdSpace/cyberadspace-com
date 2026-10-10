// Agent crews: every Cyber Ad Space project gets its own crew of agents, designed by the system.
// Studio brands come from src/data/brands.ts; client brands are delivered Brand Starter orders.
// Content agents write DRAFTS that a person approves before anything is shown publicly.
import { put, get, list } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BRANDS } from "@/data/brands";
import { factSheetText } from "@/data/factsheets";
import { aiConfigured, chatJSON } from "./ai";
import { blobConfigured, listOrders, out, PRICE_USD, type Kit, type NamesOut, type StorefrontOut } from "./orders";
import { runAudit, publicSummary } from "./audit";
import { stripeConfigured } from "./stripe";
import { XPR_ACCOUNT, XMD_CONTRACT, xprConfigured } from "./xpr";
import { sendMail, siteUrl, STUDIO_INBOX } from "./mail";

export type Project = { slug: string; name: string; tagline: string; category: string; url: string; source: "studio" | "client"; facts?: string };

export type AgentKind = "sitecheck" | "social" | "devotional" | "songwriter" | "explainer" | "outreach" | "products" | "local" | "blog" | "chat" | "audit" | "books";

// Brands whose site has the chat widget installed (the Chat Host only appears where it really exists).
export const CHAT_INSTALLED = new Set(["cyberadspace", "why-is-this-taxed", "the-faith-vault", "the-scripture-guide", "the-divine-reader", "religion-relief", "elevated-remedies", "the-vendor-space", "canamo-cafe", "the-hemp-cookies", "founding-times", "palm-polish"]);
export const CAS_SLUG = "cyberadspace";

export type CrewAgent = {
  id: string;
  kind: AgentKind;
  name: string;
  job: string;
  cadence: "daily" | "weekly" | "live";
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
  status: "draft" | "approved" | "rejected" | "auto" | "private"; // auto = shown without review; private = admin only
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
  const cas: Project = { slug: CAS_SLUG, name: "Cyber Ad Space", tagline: "We build brands & websites, and the agents that run them.", category: "Studio · Agents", url: siteUrl(), source: "studio" };
  const studio: Project[] = [cas, ...BRANDS.map((b) => ({ slug: b.slug, name: b.name, tagline: b.tagline, category: b.category, url: b.url, source: "studio" as const }))];
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
        facts: [
          "Status: Live. A brand built by Cyber Ad Space for a customer.",
          o.intake?.idea ? `What it is: ${o.intake.idea}` : "",
          o.intake?.audience ? `Audience: ${o.intake.audience}` : "",
          (out<StorefrontOut>(o, "storefront")?.products ?? []).length ? `Products:\n- ${out<StorefrontOut>(o, "storefront")!.products.map((x) => `${x.name} (${x.price})`).join("\n- ")}` : "",
          "Never say or imply: sales numbers, reviews, awards or anything not listed here",
        ].filter(Boolean).join("\n"),
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
  if (/home|solar|pool|real estate|property/.test(c)) return { kind: "local", name: "Local Writer", job: "Drafts a weekly local post for the brand's own service area" };
  return { kind: "explainer", name: "Explainer", job: "Drafts a weekly explainer outline, with sources a person must check" };
}

/** The system designs a crew from the project's own details. */
export function designCrew(p: Project, now = new Date()): Crew {
  const due = now.toISOString(); // first run is due right away
  const never = new Date(Date.UTC(2100, 0, 1)).toISOString();
  const agents: CrewAgent[] = [
    { id: "sitecheck", kind: "sitecheck", name: "Site Watch", job: "Checks every day that the site is up and how fast it loads", cadence: "daily", usesAI: false, nextRunAt: due },
    { id: "social", kind: "social", name: "Social Writer", job: "Drafts three social posts each week in the brand's voice", cadence: "weekly", day: 1, usesAI: true, nextRunAt: due },
  ];
  if (p.slug !== CAS_SLUG) { const sp = specialist(p); agents.push({ id: sp.kind, kind: sp.kind, name: sp.name, job: sp.job, cadence: "weekly", day: 4, usesAI: true, nextRunAt: due }); }
  agents.push({ id: "blog", kind: "blog", name: "Blog Writer", job: "Drafts a weekly blog post from the fact sheet; it's published in the brand's journal once approved", cadence: "weekly", day: 3, usesAI: true, nextRunAt: due });
  if (CHAT_INSTALLED.has(p.slug)) agents.push({ id: "chat", kind: "chat", name: "Chat Host", job: "Answers visitors' questions on the site, around the clock, using only the fact sheet", cadence: "live", usesAI: true, nextRunAt: never });
  if (p.slug === CAS_SLUG) {
    agents.push({ id: "audit", kind: "audit", name: "Security Auditor", job: "Checks every Cyber Ad Space site every day: uptime, certificates, broken links, forms, exposed files, leaked keys and claims that don't match the fact sheets", cadence: "daily", usesAI: false, nextRunAt: due });
    agents.push({ id: "books", kind: "books", name: "Books Keeper", job: "Keeps a private daily ledger of orders and payments (Stripe, XPR / WebAuth, manual). Read-only: it never moves money", cadence: "daily", usesAI: false, nextRunAt: due });
  }
  return { project: p, createdAt: now.toISOString(), designVersion: DESIGN_VERSION, agents, outputs: [] };
}

/** Send every project through the system: create crews that don't exist yet, refresh project details on the rest. */
export async function ensureCrews(): Promise<{ created: string[]; total: number }> {
  const projects = await allProjects();
  const created: string[] = [];
  for (const p of projects) {
    const c = await readCrew(p.slug);
    if (!c) { await saveCrew(designCrew(p)); created.push(p.name); }
    else {
      // keep project details and agent job descriptions current with the latest design
      const fresh = designCrew(p);
      let changed = JSON.stringify(c.project) !== JSON.stringify(p);
      c.project = p;
      const merged = fresh.agents.map((f) => { const old = c.agents.find((x) => x.id === f.id); return old ? { ...f, lastRunAt: old.lastRunAt, nextRunAt: f.cadence === "live" ? f.nextRunAt : old.nextRunAt, runningSince: old.runningSince, standby: old.standby } : f; });
      if (JSON.stringify(merged) !== JSON.stringify(c.agents)) { c.agents = merged; changed = true; }
      if (changed) await saveCrew(c);
    }
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
const RULES = `Rules: Use ONLY the facts in the brand's fact sheet. If something isn't in the fact sheet, don't state or imply it. Respect the fact sheet's status: if the brand is a concept or coming soon, never write as if it's open, selling or taking customers. Obey every "Never say or imply" line. Write in plain, warm, specific language. Never invent facts, statistics, reviews, testimonials, prices or customer names. Never make health or medical claims. Never copy lyrics, other brands' slogans or anyone's work. If something needs checking, say so. This is a DRAFT for a person to review before anything is published.`;

function brief(p: Project) {
  const facts = p.facts ?? factSheetText(p.slug) ?? "No fact sheet yet. Only restate the brand name, tagline and website; make no other claims.";
  return `Brand: ${p.name}\nTagline: ${p.tagline || "(none)"}\nCategory: ${p.category}\nWebsite: ${p.url}\n\nFACT SHEET (the only facts you may use):\n${facts}`;
}

type WriterKind = Exclude<AgentKind, "sitecheck" | "chat" | "audit" | "books">;
const PROMPTS: Record<WriterKind, string> = {
  blog: "Write one blog post (450-700 words) for this brand's journal that would genuinely help its audience, using only fact-sheet facts about the brand. Use a few '## ' subheadings and short paragraphs. End with one line inviting readers to visit the website. Return {\"title\": string, \"body\": string} where title is the post headline.",
  social: "Write three short social media posts for this brand: one for Instagram, one for Facebook, one for X. Each under 60 words, with 2-4 relevant hashtags. Return {\"title\": string, \"body\": string} where body lists the three posts clearly labeled.",
  devotional: "Write one short, respectful reflection post (under 150 words) that fits this faith brand's audience, without quoting copyrighted translations at length. Return {\"title\": string, \"body\": string}.",
  songwriter: "Draft an original song concept for this brand: a title, a one-line theme, a 2-line hook and an 8-line verse starter. Everything must be original. Return {\"title\": string, \"body\": string}.",
  explainer: "Draft an outline for one new explainer article that fits this brand: a headline, 4-6 section points, and a list of the official sources a person should check before publishing. Return {\"title\": string, \"body\": string}.",
  outreach: "Draft one short outreach message (under 140 words) inviting a local vendor or partner to join this marketplace. Be clear about what they get; no promises about income. Return {\"title\": string, \"body\": string}.",
  products: "Draft a short brand or product description (under 120 words) for this brand, then a 'Compliance check' line listing any words a reviewer should double-check for health claims or legal limits. Return {\"title\": string, \"body\": string}.",
  local: "Draft one local social post (under 100 words) for the area and audience named in the fact sheet. Return {\"title\": string, \"body\": string}.",
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
  const r = await chatJSON<{ title?: string; body?: string }>(`You are the ${a.name} agent for a small brand built by Cyber Ad Space. Your job: ${a.job}.\n${RULES}`, `${brief(p)}\n\n${PROMPTS[a.kind as WriterKind]}\n\nThe "title" must be a short label of 8 words or fewer. Put all the writing in "body".`);
  return { id: crypto.randomBytes(6).toString("hex"), agentId: a.id, at: new Date().toISOString(), title: String(r.title || `${a.name} draft`).split(/\s+/).slice(0, 12).join(" ").slice(0, 90), body: String(r.body || "").slice(0, a.kind === "blog" ? 9000 : 4000), status: "draft" };
}

async function runAuditAgent(): Promise<Output> {
  const projects = await allProjects();
  const report = await runAudit(projects.map((p) => ({ slug: p.slug, name: p.name, url: p.url })));
  const s = publicSummary(report);
  return { id: crypto.randomBytes(6).toString("hex"), agentId: "audit", at: new Date().toISOString(), title: s.title, body: s.body, status: "auto" };
}

async function xprIncoming(since: number): Promise<{ count: number; total: number } | null> {
  if (!xprConfigured()) return null;
  for (const base of ["https://proton.eosusa.io", "https://api.protonnz.com", "https://proton.cryptolions.io"]) {
    try {
      const res = await fetch(`${base}/v2/history/get_actions?account=${XPR_ACCOUNT}&filter=${XMD_CONTRACT}:transfer&after=${new Date(since).toISOString()}&limit=200`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;
      const body = await res.json();
      const acts: { act?: { data?: { to?: string; quantity?: string } } }[] = body?.actions ?? [];
      const inc = acts.filter((x) => x.act?.data?.to === XPR_ACCOUNT);
      return { count: inc.length, total: inc.reduce((n, x) => n + (parseFloat(String(x.act?.data?.quantity ?? "0")) || 0), 0) };
    } catch { /* try the next endpoint */ }
  }
  return null;
}

async function runBooks(): Promise<Output> {
  const orders = await listOrders().catch(() => []);
  const now = Date.now(), dayAgo = now - 864e5;
  const et = (d: number) => new Date(d).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
  const month = et(now).slice(0, 7);
  const paid = orders.filter((o) => o.paid);
  const last24 = paid.filter((o) => Date.parse(o.updatedAt) >= dayAgo && o.history.some((h) => /^(paid|marked paid|payment (received|confirmed))/i.test(h.event) && Date.parse(h.at) >= dayAgo));
  const mtd = paid.filter((o) => et(Date.parse(o.createdAt)).startsWith(month));
  const by = (list: typeof paid) => list.reduce<Record<string, number>>((m, o) => { const k = o.paidVia || "manual"; m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const fmt = (m: Record<string, number>) => Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ") || "none";
  const xpr = await xprIncoming(dayAgo);
  const lines = [
    `Brand Starter orders paid in the last 24 hours: ${last24.length} (${fmt(by(last24))}), about $${last24.length * PRICE_USD}.`,
    `Paid this month (${month}): ${mtd.length} (${fmt(by(mtd))}), about $${mtd.length * PRICE_USD}.`,
    `Waiting for payment: ${orders.filter((o) => !o.paid).length}. Being built: ${orders.filter((o) => o.status === "queued" || o.status === "generating").length}. Waiting for your review: ${orders.filter((o) => o.status === "review").length}. Delivered: ${orders.filter((o) => o.status === "delivered").length}.`,
    `Stripe: ${stripeConfigured() ? "connected" : "not connected yet, so card payments aren't being tracked"}.`,
    xpr ? `XPR / WebAuth: ${xpr.count} incoming XMD transfer${xpr.count === 1 ? "" : "s"} in the last 24 hours, ${xpr.total.toFixed(2)} XMD.` : `XPR / WebAuth: ${xprConfigured() ? "the chain couldn't be reached today" : "no XPR account is set up yet"}.`,
    "Read-only. This agent never moves money.",
  ];
  const body = lines.join("\n");
  await sendMail({ to: STUDIO_INBOX, subject: `Books: ${et(now)}`, text: body }).catch(() => undefined);
  return { id: crypto.randomBytes(6).toString("hex"), agentId: "books", at: new Date().toISOString(), title: `Books for ${et(now)}`, body, status: "private" };
}

function trimOutputs(c: Crew) {
  const daily = new Set(["sitecheck", "audit", "books"]);
  const keep = [...daily].flatMap((id) => c.outputs.filter((o) => o.agentId === id).slice(0, 7));
  const rest = c.outputs.filter((o) => !daily.has(o.agentId)).slice(0, 40);
  c.outputs = [...keep, ...rest].sort((a, b) => b.at.localeCompare(a.at));
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
  if (a.kind === "chat") return null; // the Chat Host works live on the site, not on a schedule
  if (a.usesAI && !aiConfigured()) {
    a.standby = "Waiting for an AI key"; await saveCrew(c); return null;
  }
  await markRunning(slug, agentId, true);
  let o: Output | null = null;
  try {
    o = a.kind === "sitecheck" ? await runSiteCheck(c.project) : a.kind === "audit" ? await runAuditAgent() : a.kind === "books" ? await runBooks() : await runContent(c.project, a);
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
    if (a.kind === "chat" || a.kind === "audit") continue; // chat is live; the audit has its own daily job
    const due = Date.parse(a.nextRunAt) <= now || (a.usesAI && !a.lastRunAt);
    if (!due) continue;
    if (a.kind === "sitecheck") { checks.push(runAgent(c.project.slug, a.id)); continue; }
    if (onlyChecks) continue;
    if (a.usesAI) { if (!aiConfigured() || queued >= maxContent) continue; queued++; }
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
  const total = crews.reduce((n, c) => n + c.agents.filter((a) => a.usesAI && a.kind !== "chat" && (Date.parse(a.nextRunAt) <= now || !a.lastRunAt)).length, 0);
  return { ran, drafts, waiting: Math.max(0, total - queued) };
}

export async function reviewOutput(slug: string, outputId: string, decision: "approved" | "rejected") {
  const c = await readCrew(slug); if (!c) return;
  const o = c.outputs.find((x) => x.id === outputId); if (!o || o.status === "auto" || o.status === "private") return;
  o.status = decision; await saveCrew(c);
}

// ---------- public view ----------
export type PublicAgentStatus = "working" | "idle" | "standby";
export type PublicCrew = {
  project: Project;
  agents: { id: string; name: string; job: string; cadence: string; status: PublicAgentStatus; note?: string; lastRunAt?: string }[];
  work: { agent: string; title: string; body: string; at: string }[];
};

/** When each brand's Chat Host last answered someone (from chat activity files). */
export async function chatActivity(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  try {
    if (LOCAL()) {
      const dir = path.join(LOCAL()!, "chat-activity");
      for (const f of await fs.readdir(dir).catch(() => [] as string[])) out[f.replace(/\.json$/, "")] = (await fs.stat(path.join(dir, f))).mtimeMs;
      return out;
    }
    if (!blobConfigured()) return out;
    const page = await list({ prefix: "chat-activity/", limit: 1000 });
    for (const b of page.blobs) out[b.pathname.slice("chat-activity/".length).replace(/\.json$/, "")] = new Date(b.uploadedAt).getTime();
  } catch { /* no activity data */ }
  return out;
}

export function toPublic(c: Crew, activity: Record<string, number> = {}): PublicCrew {
  const now = Date.now();
  const { facts: _private, ...project } = c.project; // client facts come from a private order; never publish them
  void _private;
  return {
    project,
    agents: c.agents.map((a) => {
      const chatting = a.kind === "chat" && now - (activity[c.project.slug] ?? 0) < 3 * 60_000;
      return {
        id: a.id, name: a.name, job: a.job,
        cadence: a.cadence === "live" ? "Always on" : a.cadence === "daily" ? "Daily" : `Weekly, ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][a.day ?? 1]}`,
        status: chatting || (a.runningSince && now - Date.parse(a.runningSince) < 5 * 60_000) ? "working" : a.usesAI && !aiConfigured() ? "standby" : "idle",
        note: a.usesAI && !aiConfigured() ? "Waiting for an AI key" : undefined,
        lastRunAt: a.kind === "chat" ? (activity[c.project.slug] ? new Date(activity[c.project.slug]).toISOString() : undefined) : a.lastRunAt,
      };
    }),
    work: c.outputs
      .filter((o) => o.status === "approved" || o.status === "auto")
      .filter((o, i, all) => !["sitecheck", "audit"].includes(o.agentId) || all.findIndex((x) => x.agentId === o.agentId) === i)
      .slice(0, 5)
      .map((o) => ({ agent: c.agents.find((a) => a.id === o.agentId)?.name ?? "Agent", title: o.title, body: o.body.slice(0, 600), at: o.at })),
  };
}

/** Approved blog posts for the public journal. */
export async function journal(slug?: string) {
  const crews = await allCrews();
  return crews.filter((c) => !slug || c.project.slug === slug).flatMap((c) => c.outputs
    .filter((o) => o.agentId === "blog" && o.status === "approved")
    .map((o) => ({ slug: c.project.slug, brand: c.project.name, brandUrl: c.project.url, id: o.id, title: o.title, body: o.body, at: o.at })))
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** Drafts waiting for a person, for the review tools. */
export async function pendingDrafts() {
  const crews = await allCrews();
  return crews.flatMap((c) => c.outputs.filter((o) => o.status === "draft").map((o) => ({
    slug: c.project.slug, project: c.project.name, category: c.project.category, url: c.project.url,
    agent: c.agents.find((a) => a.id === o.agentId)?.name ?? o.agentId, id: o.id, at: o.at, title: o.title, body: o.body,
  })));
}
