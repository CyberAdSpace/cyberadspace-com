// Agent crews: every Cyber Ad Space project gets its own crew of agents, designed by the system.
// Studio brands come from src/data/brands.ts; client brands are delivered Brand Starter orders.
// Content agents write DRAFTS that a person approves before anything is shown publicly.
import { put, get, list } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { BRANDS } from "@/data/brands";
import { FACTS, factSheetText } from "@/data/factsheets";
import { aiConfigured, chatJSON, researchJSON, type Source } from "./ai";
import { blobConfigured, listOrders, out, PRICE_USD, type Kit, type NamesOut, type StorefrontOut } from "./orders";
import { runAudit, publicSummary, latestAudit } from "./audit";
import { stripeConfigured } from "./stripe";
import { XPR_ACCOUNT, XMD_CONTRACT, xprConfigured } from "./xpr";
import { sendMail, siteUrl, STUDIO_INBOX } from "./mail";
import { OWNER_PROFILE } from "@/data/owner";

export type Project = { slug: string; name: string; tagline: string; category: string; url: string; source: "studio" | "client"; facts?: string };

export type AgentKind = "sitecheck" | "social" | "devotional" | "songwriter" | "explainer" | "outreach" | "products" | "local" | "blog" | "chat" | "audit" | "books" | "develop" | "compliance" | "chief";

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
  note?: string; // Mini Me's recommendation on a draft
};

export type Crew = {
  project: Project; createdAt: string; designVersion: number; agents: CrewAgent[]; outputs: Output[];
  ownerNotes?: string; ownerNotesAt?: string; // the owner's answers to the Brand Developer's questions (treated as confirmed facts)
  rules?: string[]; rulesAt?: string; // "don't say" lines found by the Compliance Researcher; every writer obeys them
};

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

/** Where a brand is: concept and pre-launch brands get a Brand Developer that brings them to life. */
export function stageOf(slug: string): "concept" | "prelaunch" | "live" {
  const st = FACTS[slug]?.status ?? "";
  if (/^concept/i.test(st)) return "concept";
  if (/coming soon|early access|not fully open/i.test(st)) return "prelaunch";
  return "live";
}

/** Brands in regulated areas get a Compliance Researcher, focused on the rules that apply to them. */
const HEMP_TOPIC = "Marketing hemp foods and hemp-derived cannabinoid products in Florida and the U.S.: FDA rules on health, nutrient-content and structure/function claims and on CBD in food; FTC advertising substantiation; Florida's hemp law (s. 581.217, Florida Statutes) and Florida Department of Agriculture rules, including 21+ limits and advertising that appeals to children; and the federal hemp redefinition in P.L. 119-103 (synthesized cannabinoids excluded from Nov 12, 2026; the rest from Dec 11, 2026).";
export const COMPLIANCE_TOPICS: Record<string, string> = {
  "canamo-cafe": HEMP_TOPIC + " Also: Colombian coffee and panela import labeling basics.",
  "the-hemp-cookies": HEMP_TOPIC,
  "the-green-oven": HEMP_TOPIC + " Also: rules for marketing a food concept that isn't open yet.",
  "national-cannabis-union": "Accuracy of statements about the federal hemp redefinition (P.L. 119-103 / H.R. 6500) and its effective dates; rules for advocacy and petition sites that collect names and emails (privacy notices, consent); avoiding legal advice.",
  "solar-splashing": "Florida contractor licensing under Chapter 489, Florida Statutes, for solar and pool/spa work, including who may offer, advertise or quote contracting work, and the license-number-in-advertising requirement; FTC and Florida rules on solar savings and payback claims; how a brand can recruit a licensed contractor without itself acting as a contractor.",
  "antrias-academy": "Children's online privacy (COPPA, 16 CFR Part 312) for a site where parents make custom songs with a child's name; FTC rules on advertising to and around children; what an AI chat assistant on a kids' brand may and may not ask.",
  "palm-polish": "Running a two-sided marketplace for mobile car detailing in Florida: describing the service area accurately, independent-contractor language, any local business tax receipts or environmental (water runoff) rules for mobile detailing, and terms users should see.",
};

/** The system designs a crew from the project's own details. */
export function designCrew(p: Project, now = new Date()): Crew {
  const due = now.toISOString(); // first run is due right away
  const never = new Date(Date.UTC(2100, 0, 1)).toISOString();
  const agents: CrewAgent[] = [
    { id: "sitecheck", kind: "sitecheck", name: "Site Watch", job: "Checks every day that the site is up and how fast it loads", cadence: "daily", usesAI: false, nextRunAt: due },
    { id: "social", kind: "social", name: "Social Writer", job: "Drafts three social posts each week in the brand's voice", cadence: "weekly", day: 1, usesAI: true, nextRunAt: due },
  ];
  if (p.slug !== CAS_SLUG) { const sp = specialist(p); agents.push({ id: sp.kind, kind: sp.kind, name: sp.name, job: sp.job, cadence: "weekly", day: 4, usesAI: true, nextRunAt: due }); }
  if (p.source === "studio" && stageOf(p.slug) !== "live") agents.push({ id: "develop", kind: "develop", name: "Brand Developer", job: "Brings the idea to life: researches the market, works out what it is, who it's for, how it earns and what launch needs, and asks the owner the questions only they can answer", cadence: "weekly", day: 5, usesAI: true, nextRunAt: due });
  if (COMPLIANCE_TOPICS[p.slug]) agents.push({ id: "compliance", kind: "compliance", name: "Compliance Researcher", job: "Researches current law and official guidance on what this brand can legally say, checks the live site, and proposes compliant rewrites for a person (and a lawyer, where needed) to confirm", cadence: "weekly", day: 2, usesAI: true, nextRunAt: due });
  agents.push({ id: "blog", kind: "blog", name: "Blog Writer", job: "Drafts a weekly blog post from the fact sheet; it's published in the brand's journal once approved", cadence: "weekly", day: 3, usesAI: true, nextRunAt: due });
  if (CHAT_INSTALLED.has(p.slug)) agents.push({ id: "chat", kind: "chat", name: "Chat Host", job: "Answers visitors' questions on the site, around the clock, using only the fact sheet", cadence: "live", usesAI: true, nextRunAt: never });
  if (p.slug === CAS_SLUG) {
    agents.unshift({ id: "chief", kind: "chief", name: "Mini Me", job: "In charge of every agent. Thinks like the owner: reads everything the crews produced, checks it against the $1K/month bar, sends agents to work, recommends approve or reject on every draft and writes the owner one daily brief", cadence: "daily", usesAI: true, nextRunAt: due });
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

function brief(p: Project, c?: Crew | null) {
  const facts = p.facts ?? factSheetText(p.slug) ?? "No fact sheet yet. Only restate the brand name, tagline and website; make no other claims.";
  const owner = c?.ownerNotes?.trim() ? `\n\nOWNER'S NOTES (confirmed by the owner; you may use these as facts):\n${c.ownerNotes.trim().slice(0, 4000)}` : "";
  const rules = c?.rules?.length ? `\n\nCOMPLIANCE RULES (from the Compliance Researcher; never break these):\n- ${c.rules.slice(0, 20).join("\n- ")}` : "";
  return `Brand: ${p.name}\nTagline: ${p.tagline || "(none)"}\nCategory: ${p.category}\nWebsite: ${p.url}\n\nFACT SHEET (the only facts you may use):\n${facts}${owner}${rules}`;
}

type WriterKind = Exclude<AgentKind, "sitecheck" | "chat" | "audit" | "books" | "develop" | "compliance" | "chief">;
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

async function runContent(p: Project, a: CrewAgent, c?: Crew | null): Promise<Output> {
  const r = await chatJSON<{ title?: string; body?: string }>(`You are the ${a.name} agent for a small brand built by Cyber Ad Space. Your job: ${a.job}.\n${RULES}`, `${brief(p, c)}\n\n${PROMPTS[a.kind as WriterKind]}\n\nThe "title" must be a short label of 8 words or fewer. Put all the writing in "body".`);
  return { id: crypto.randomBytes(6).toString("hex"), agentId: a.id, at: new Date().toISOString(), title: String(r.title || `${a.name} draft`).split(/\s+/).slice(0, 12).join(" ").slice(0, 90), body: String(r.body || "").slice(0, a.kind === "blog" ? 9000 : 4000), status: "draft" };
}

const id6 = () => crypto.randomBytes(6).toString("hex");
const bullets = (xs: unknown, bullet = "- ") => (Array.isArray(xs) ? xs : []).map((x) => `${bullet}${typeof x === "string" ? x : JSON.stringify(x)}`).join("\n");
const sourcesText = (s: Source[]) => (s.length ? `\n\nSources:\n${s.slice(0, 15).map((x) => `- ${x.title}: ${x.url}`).join("\n")}` : "\n\nSources: none (web search wasn't available on this run, so treat everything above as unverified).");

/** Read the brand's live home page as plain text so agents work from what the site really says. */
async function siteText(url: string): Promise<string> {
  try {
    const res = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "CyberAdSpace Agents" } });
    const html = await res.text();
    return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim().slice(0, 7000);
  } catch (e) { return `(couldn't read the site: ${e instanceof Error ? e.message : String(e)})`; }
}

type DevelopOut = {
  title?: string; what?: string; who?: string; problem?: string; offer?: string;
  money?: { way?: string; who_pays?: string; price_range?: string; effort?: string }[];
  launch_needs?: string[]; demand_test?: string; next_steps?: string[]; site_fixes?: { now?: string; suggested?: string }[]; questions?: string[];
};

async function runDevelop(c: Crew, a: CrewAgent): Promise<Output> {
  const p = c.project, stage = stageOf(p.slug);
  const live = await siteText(p.url);
  const prior = c.outputs.find((o) => o.agentId === "develop" && o.status !== "rejected");
  const { data: r, sources, searched } = await researchJSON<DevelopOut>(
    `You are the Brand Developer agent at Cyber Ad Space. Your job is to bring a ${stage === "concept" ? "concept" : "pre-launch"} brand to life: work out exactly what it is, who it's for, how it earns, and what launching really takes. Research the real market (competitors, typical prices in the brand's area, licenses or partners required). Label every number as an estimate. Never invent customers, reviews or results. Anything the owner hasn't confirmed is a proposal, not a fact. If the brand is a concept, never propose copy that offers to sell, quote or serve customers before it legally can. Build on your previous brief and the owner's answers instead of starting over.`,
    `${brief(p, c)}\n\nWHAT THE LIVE SITE SAYS NOW:\n${live}\n\n${prior ? `YOUR PREVIOUS BRIEF (${prior.at.slice(0, 10)}):\n${prior.body.slice(0, 3500)}\n\n` : ""}Return {"title": short label, "what": 1-2 sentences, "who": the specific customer (and, for a concept, the operator who could run it), "problem": what it solves, "offer": the first offer, "money": [{"way","who_pays","price_range","effort"}] (2-4 ways, estimates), "launch_needs": [licenses, partners, setup], "demand_test": the cheapest fast test of demand, "next_steps": [5-7 small tasks, each doable in one sitting], "site_fixes": [{"now": exact quote from the live site that's wrong or risky for this stage, "suggested": replacement}], "questions": [up to 5 questions only the owner can answer, most important first, skipping anything the owner's notes already answer]}.`,
  );
  const money = (r.money ?? []).map((m) => `- ${m.way}: ${m.who_pays} pays ${m.price_range} (effort: ${m.effort})`).join("\n");
  const fixes = (r.site_fixes ?? []).filter((f) => f.now).map((f) => `- Now: "${f.now}"\n  Suggested: "${f.suggested}"`).join("\n");
  const body = [
    `Stage: ${stage}. ${c.ownerNotes ? `Built on your notes from ${c.ownerNotesAt?.slice(0, 10)}.` : "No owner notes yet; answer the questions at the end to sharpen the next brief."}`,
    `## What it is\n${r.what ?? ""}`, `## Who it's for\n${r.who ?? ""}`, `## Problem it solves\n${r.problem ?? ""}`, `## First offer\n${r.offer ?? ""}`,
    `## How it can earn (estimates)\n${money}`, `## What launch needs\n${bullets(r.launch_needs)}`, `## Cheapest demand test\n${r.demand_test ?? ""}`,
    `## Next steps\n${bullets(r.next_steps)}`, fixes ? `## Site fixes for this stage\n${fixes}` : "",
    `## Questions for you\n${bullets(r.questions, "? ")}`,
  ].filter(Boolean).join("\n\n") + sourcesText(searched ? sources : []);
  return { id: id6(), agentId: a.id, at: new Date().toISOString(), title: String(r.title || "Brand brief").split(/\s+/).slice(0, 8).join(" "), body: body.slice(0, 12000), status: "private" };
}

type ComplianceOut = {
  title?: string; summary?: string; can_say?: string[]; cannot_say?: string[];
  rewrites?: { current?: string; problem?: string; suggested?: string }[]; dates?: string[]; for_attorney?: string[];
};

async function runCompliance(c: Crew, a: CrewAgent): Promise<Output> {
  const p = c.project;
  const topic = COMPLIANCE_TOPICS[p.slug] ?? "General U.S. and Florida advertising law (FTC Act section 5, truth in advertising).";
  const live = await siteText(p.url);
  const audit = (await latestAudit())?.sites.find((s) => s.slug === p.slug);
  const flagged = audit?.checks.filter((k) => k.status === "fail" || k.status === "warn").map((k) => `${k.label}: ${k.detail}`).join("\n") || "(nothing flagged)";
  const { data: r, sources, searched } = await researchJSON<ComplianceOut>(
    `You are the Compliance Researcher agent at Cyber Ad Space. You research, the way a careful paralegal would, what a brand can and can't legally say, using current statutes, regulations and official agency guidance (FDA, FTC, Florida statutes and agency rules, and so on). Cite official sources wherever you can. You are not a lawyer and this is not legal advice: be specific about rules, flag anything uncertain, and list the questions a licensed Florida attorney should confirm. Propose rewrites that keep the brand's voice but stay inside the rules. Never propose claims the fact sheet doesn't support.`,
    `${brief(p, c)}\n\nAREA TO RESEARCH:\n${topic}\n\nWHAT THE LIVE SITE SAYS NOW:\n${live}\n\nFLAGGED BY TODAY'S SECURITY AUDIT:\n${flagged}\n\nReturn {"title": short label, "summary": 2-3 plain sentences on the main rules, "can_say": [plain statements this brand can safely make], "cannot_say": [short rules, each a 'Don't ...' line], "rewrites": [{"current": exact quote from the live site, "problem": which rule it breaks, "suggested": compliant replacement}] (cover every risky line on the site, including the audit flags), "dates": [rule changes or deadlines that affect this brand, with dates], "for_attorney": [questions a licensed attorney should confirm]}.`,
  );
  // every writer for this brand obeys the "don't" rules from now on (restrictions only, so they're safe to apply before review)
  const fresh = await readCrew(p.slug);
  if (fresh && r.cannot_say?.length) { fresh.rules = r.cannot_say.map(String).slice(0, 20); fresh.rulesAt = new Date().toISOString(); await saveCrew(fresh); }
  const rewrites = (r.rewrites ?? []).filter((x) => x.current).map((x) => `- Now: "${x.current}"\n  Why: ${x.problem}\n  Suggested: "${x.suggested}"`).join("\n");
  const body = [
    "Research by an AI agent, not legal advice. Have a licensed Florida attorney confirm the open questions before relying on it.",
    `## Summary\n${r.summary ?? ""}`, `## Can say\n${bullets(r.can_say)}`, `## Can't say\n${bullets(r.cannot_say)}`,
    rewrites ? `## Proposed rewrites for the live site\n${rewrites}` : "## Proposed rewrites for the live site\nNothing risky found on the home page.",
    r.dates?.length ? `## Dates that matter\n${bullets(r.dates)}` : "", `## For a lawyer to confirm\n${bullets(r.for_attorney)}`,
  ].filter(Boolean).join("\n\n") + sourcesText(searched ? sources : []);
  return { id: id6(), agentId: a.id, at: new Date().toISOString(), title: String(r.title || "Compliance memo").split(/\s+/).slice(0, 8).join(" "), body: body.slice(0, 12000), status: "private" };
}

type ChiefOut = {
  headline?: string;
  priorities?: { brand?: string; why?: string; action?: string }[];
  reviews?: { id?: string; decision?: "approve" | "reject" | "edit"; reason?: string }[];
  dispatch?: { slug?: string; agent?: string; reason?: string }[];
  dollar_bar?: { brand?: string; verdict?: string }[];
  owner_questions?: string[];
  next_step?: string;
};

/** Mini Me: the agent in charge. Reads every crew, the audit and the books, thinks like the owner, and directs the work. */
async function runChief(a: CrewAgent): Promise<Output> {
  const crews = await allCrews();
  const audit = await latestAudit();
  const day = 864e5 * 8;
  const recent = (c: Crew) => c.outputs.filter((o) => Date.now() - Date.parse(o.at) < day && o.agentId !== "sitecheck" && o.agentId !== "chief");
  const drafts = crews.flatMap((c) => c.outputs.filter((o) => o.status === "draft").map((o) => ({ c, o })));
  const board = crews.map((c) => {
    const st = stageOf(c.project.slug);
    const site = audit?.sites.find((s) => s.slug === c.project.slug);
    const issues = site?.checks.filter((k) => k.status === "fail" || k.status === "warn").map((k) => `${k.label}: ${k.detail}`).join(" | ");
    const work = recent(c).filter((o) => o.status !== "draft").slice(0, 4).map((o) => `  - ${c.agents.find((x) => x.id === o.agentId)?.name}: ${o.title} — ${o.body.replace(/\s+/g, " ").slice(0, o.agentId === "develop" || o.agentId === "compliance" ? 900 : 200)}`).join("\n");
    return `## ${c.project.name} (slug ${c.project.slug}; ${c.project.category}; stage ${st}${site ? `; audit ${site.grade}` : ""})\nAgents: ${c.agents.map((x) => `${x.id}${x.lastRunAt ? "" : " (never ran)"}`).join(", ")}${c.ownerNotes ? `\nOwner notes: ${c.ownerNotes.slice(0, 400)}` : ""}${issues ? `\nAudit issues: ${issues.slice(0, 700)}` : ""}${work ? `\nRecent work:\n${work}` : ""}`;
  }).join("\n\n");
  const books = crews.find((c) => c.project.slug === CAS_SLUG)?.outputs.find((o) => o.agentId === "books")?.body ?? "No books yet.";
  const draftList = drafts.slice(0, 40).map(({ c, o }) => `[${o.id}] ${c.project.name} · ${c.agents.find((x) => x.id === o.agentId)?.name}: ${o.title}\n${o.body.replace(/\s+/g, " ").slice(0, 500)}`).join("\n\n") || "(no drafts waiting)";
  const r = await chatJSON<ChiefOut>(
    `You are Mini Me, the agent in charge of every Cyber Ad Space agent crew. You think like the owner. Their profile:\n${OWNER_PROFILE}\n\nYour job each morning: read everything below, decide what matters most for reaching $1K/month per brand, direct the agents, and brief the owner in a few direct lines. Be honest, practical and encouraging; never sugarcoat; label estimates; never promise income. Legal and health-claim risks come first. You can dispatch these agents to run today: develop (Brand Developer, concept/pre-launch brands only), compliance (Compliance Researcher), blog, social, and each brand's specialist; only dispatch an agent id that brand actually has. Recommend approve, reject or edit for every waiting draft: reject anything with health claims, invented facts, wrong status (selling a concept), or that wouldn't help the brand earn.`,
    `TODAY'S BOARD\n\n${board}\n\nBOOKS\n${books}\n\nDRAFTS WAITING FOR THE OWNER\n${draftList}\n\nReturn {"headline": one sentence, "priorities": [{"brand","why","action"}] (top 3-5, most important first), "reviews": [{"id": draft id in brackets, "decision": "approve"|"reject"|"edit", "reason": short}], "dispatch": [{"slug","agent","reason"}] (at most 8), "dollar_bar": [{"brand","verdict": one line on its path to $1K/month and the next lever}] (only brands where you have something useful to say), "owner_questions": [at most 3 decisions only the owner can make], "next_step": the single most important thing for the owner to do today}.`,
  );
  // act: dispatch agents (they run in this same job) and attach recommendations to drafts
  const dispatched: string[] = [];
  for (const d of (r.dispatch ?? []).slice(0, 8)) {
    const c = await readCrew(String(d.slug ?? "")); if (!c) continue;
    const ag = c.agents.find((x) => x.id === d.agent && x.kind !== "chat" && x.kind !== "chief" && x.kind !== "audit" && x.kind !== "books");
    if (!ag) continue;
    ag.nextRunAt = new Date().toISOString(); await saveCrew(c);
    dispatched.push(`${c.project.name} → ${ag.name}: ${d.reason ?? ""}`);
  }
  const notes = new Map((r.reviews ?? []).filter((x) => x.id).map((x) => [String(x.id).replace(/[[\]]/g, ""), x]));
  for (const c of crews) {
    let touched = false;
    const fresh = await readCrew(c.project.slug); if (!fresh) continue;
    for (const o of fresh.outputs) { const n = notes.get(o.id); if (n && o.status === "draft") { o.note = `Mini Me: ${n.decision} — ${n.reason ?? ""}`; touched = true; } }
    if (touched) await saveCrew(fresh);
  }
  const body = [
    r.headline ?? "",
    `## Priorities\n${(r.priorities ?? []).map((p, i) => `${i + 1}. ${p.brand}: ${p.why} → ${p.action}`).join("\n")}`,
    dispatched.length ? `## Agents I sent to work today\n${dispatched.map((x) => `- ${x}`).join("\n")}` : "",
    notes.size ? `## Drafts\nI marked ${notes.size} draft${notes.size === 1 ? "" : "s"} with approve / reject / edit. You still make the call on /admin/crews.` : "",
    r.dollar_bar?.length ? `## The $1K bar\n${r.dollar_bar.map((d) => `- ${d.brand}: ${d.verdict}`).join("\n")}` : "",
    r.owner_questions?.length ? `## Your call\n${r.owner_questions.map((q) => `- ${q}`).join("\n")}` : "",
    `**Next step:** ${r.next_step ?? ""}`,
  ].filter(Boolean).join("\n\n");
  await sendMail({ to: STUDIO_INBOX, subject: `Mini Me: ${String(r.headline ?? "today's brief").slice(0, 90)}`, text: `${body}\n\nEverything: ${siteUrl()}/admin/crews` }).catch(() => undefined);
  return { id: id6(), agentId: a.id, at: new Date().toISOString(), title: "Daily brief", body: body.slice(0, 12000), status: "private" };
}

/** Save the owner's answers for the Brand Developer (and every writer) to use. */
export async function saveOwnerNotes(slug: string, notes: string) {
  const c = await readCrew(slug); if (!c) return;
  c.ownerNotes = notes.slice(0, 6000); c.ownerNotesAt = new Date().toISOString();
  await saveCrew(c);
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
  const daily = new Set(["sitecheck", "audit", "books", "chief"]);
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
    o = a.kind === "sitecheck" ? await runSiteCheck(c.project) : a.kind === "audit" ? await runAuditAgent() : a.kind === "books" ? await runBooks() : a.kind === "develop" ? await runDevelop(c, a) : a.kind === "compliance" ? await runCompliance(c, a) : a.kind === "chief" ? await runChief(a) : await runContent(c.project, a, c);
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
    if (a.kind === "chat" || a.kind === "audit" || a.kind === "chief" || RESEARCH.has(a.kind)) continue; // chat is live; audit and research have their own daily jobs
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
        if (o) { ran++; if (o.status === "draft" || a.kind === "develop" || a.kind === "compliance") drafts.push({ project: g.project, agent: a.name, title: o.title }); }
      }
    }
  };
  await Promise.all([Promise.all(checks), ...Array.from({ length: 6 }, worker)]);
  ran += checks.length;
  if (drafts.length) {
    await sendMail({
      to: STUDIO_INBOX,
      subject: `${drafts.length} new agent draft${drafts.length === 1 ? "" : "s"} to review`,
      text: `Your agents wrote ${drafts.length} new draft${drafts.length === 1 ? "" : "s"} and plans:\n\n${drafts.map((d) => `- ${d.project}: ${d.agent}, "${d.title}"`).join("\n")}\n\nReview them here: ${siteUrl()}/admin/crews\n\nNothing is shown publicly until you approve it.`,
    }).catch(() => undefined);
  }
  const total = crews.reduce((n, c) => n + c.agents.filter((a) => a.usesAI && a.kind !== "chat" && (Date.parse(a.nextRunAt) <= now || !a.lastRunAt)).length, 0);
  return { ran, drafts, waiting: Math.max(0, total - queued) };
}

const RESEARCH = new Set<AgentKind>(["develop", "compliance"]);

/** Daily job for the research agents (Brand Developer, Compliance Researcher). They search the web and take a few
 *  minutes each, so they all run in parallel in their own job. Pass force to run them all now. */
export async function runResearchDue(force = false): Promise<{ ran: { project: string; agent: string; title: string }[] }> {
  if (!aiConfigured()) return { ran: [] };
  const now = Date.now();
  const crews = await allCrews();
  const jobs = crews.flatMap((c) => c.agents.filter((a) => RESEARCH.has(a.kind) && (force || !a.lastRunAt || Date.parse(a.nextRunAt) <= now)).map((a) => ({ c, a })));
  // one project's agents share a file, so run them in order per project; projects in parallel
  const byProject = new Map<string, typeof jobs>();
  for (const j of jobs) byProject.set(j.c.project.slug, [...(byProject.get(j.c.project.slug) ?? []), j]);
  const ran: { project: string; agent: string; title: string }[] = [];
  await Promise.all([...byProject.values()].map(async (list) => {
    for (const { c, a } of list) { const o = await runAgent(c.project.slug, a.id); if (o) ran.push({ project: c.project.name, agent: a.name, title: o.title }); }
  }));
  if (ran.length) {
    await sendMail({
      to: STUDIO_INBOX,
      subject: `${ran.length} new brand brief${ran.length === 1 ? "" : "s"} and compliance memo${ran.length === 1 ? "" : "s"}`,
      text: `Your research agents finished:\n\n${ran.map((d) => `- ${d.project}: ${d.agent}, "${d.title}"`).join("\n")}\n\nRead them, answer the Brand Developer's questions and approve site fixes here: ${siteUrl()}/admin/crews\n\nCompliance memos are research, not legal advice.`,
    }).catch(() => undefined);
  }
  return { ran };
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
