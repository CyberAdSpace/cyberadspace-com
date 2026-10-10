// AI Counsel: the Cyber Ad Space attorney agent. It learns the way attorneys do:
// primary law first (statutes, regulations), then how courts and agencies apply it, then it keeps
// current (new rules, amendments, effective dates), and it reasons in IRAC. Everything it learns is
// kept in a law library with citations, which the Compliance Researchers and writers use.
// It is not a licensed attorney and never presents itself to the public as one.
import { put, get } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { researchJSON, type Source } from "./ai";

export type LawRule = { rule: string; citation: string; url?: string; kind: "statute" | "regulation" | "guidance" | "case" | "other"; effective?: string; checkedAt: string };
export type LawTopic = { key: string; title: string; scope: string; rules: LawRule[]; openIssues: string[]; lastStudiedAt?: string; sessions: number };
export type CounselQuestion = { id: string; question: string; askedAt: string; answer?: string; answeredAt?: string };
export type Library = { topics: LawTopic[]; questions: CounselQuestion[]; updates: { at: string; title: string; url: string; topic: string }[] };

const FILE = "counsel/library.json";
const LOCAL = () => process.env.LOCAL_STORE_DIR;

/** The areas of law CAS brands live in. Brands map to these in COUNSEL_TOPICS_FOR. */
const CURRICULUM: Omit<LawTopic, "rules" | "openIssues" | "sessions">[] = [
  { key: "hemp-federal", title: "Federal hemp law", scope: "The federal definition of hemp (7 U.S.C. 1639o), the redefinition in P.L. 119-103 / H.R. 6500 and its effective dates (synthesized cannabinoids Nov 12, 2026; the rest Dec 11, 2026), total-THC limits per container, and what hemp-derived cannabinoid products (CBD, CBG, CBN, CBC, CBT) can still be sold after each date." },
  { key: "hemp-food-claims", title: "Hemp foods: claims and FDA", scope: "FDA rules on hemp seed foods (GRAS notices), CBD and other cannabinoids in food and dietary supplements, health claims, structure/function claims, nutrient content claims (\"high in\", \"good source\", \"complete protein\", PDCAAS), and FDA/FTC warning letters to hemp and CBD sellers." },
  { key: "hemp-florida", title: "Florida hemp law", scope: "Florida's hemp program (s. 581.217, Florida Statutes) and Department of Agriculture rules (Rule 5K-4.034 and related): 21+ sales, packaging, labeling, advertising and anything attractive to children, permits needed to sell hemp extract food." },
  { key: "ftc-advertising", title: "Truth in advertising", scope: "FTC Act section 5, substantiation for claims, endorsements and reviews (16 CFR Part 255), the FTC rule on fake reviews and testimonials (16 CFR Part 465), AI-generated content disclosures, Florida's Deceptive and Unfair Trade Practices Act (FDUTPA, s. 501.201 et seq.)." },
  { key: "fl-contracting", title: "Florida contractor licensing", scope: "Chapter 489, Florida Statutes: who may offer, advertise or quote contracting work (s. 489.127), license-number-in-advertising rules (s. 489.119), solar and pool/spa license categories, and whether and how an unlicensed referral or lead-generation business may operate." },
  { key: "kids-privacy", title: "Children's privacy", scope: "COPPA (15 U.S.C. 6501-6506, 16 CFR Part 312) including the 2025 amendments, what counts as personal information (a child's name in a song), verifiable parental consent, and Florida's laws on minors online." },
  { key: "ai-music", title: "AI music and copyright", scope: "Copyright in AI-generated music and lyrics (U.S. Copyright Office guidance and Part 2 report, Thaler v. Perlmutter), human authorship, what platforms' terms (e.g. Mureka, Suno) grant for commercial use, distribution to streaming services, and sync licensing." },
  { key: "marketplaces", title: "Marketplaces and payments", scope: "Running two-sided marketplaces and booking platforms in Florida: platform terms, independent-contractor status, Florida sales tax on platform fees and digital products, payment processor rules (Stripe restricted businesses incl. hemp/CBD), crypto payments and money-transmitter questions." },
  { key: "tax-info", title: "Tax information publishing", scope: "Publishing general tax explanations without giving tax advice: IRS Circular 230 scope, unauthorized practice concerns, disclaimers, and accuracy duties for a tax-explainer site." },
];

/** Which areas of law each brand depends on. */
export const COUNSEL_TOPICS_FOR: Record<string, string[]> = {
  "canamo-cafe": ["hemp-federal", "hemp-food-claims", "hemp-florida", "ftc-advertising"],
  "the-hemp-cookies": ["hemp-federal", "hemp-food-claims", "hemp-florida", "ftc-advertising"],
  "the-green-oven": ["hemp-federal", "hemp-food-claims", "hemp-florida"],
  "national-cannabis-union": ["hemp-federal"],
  "solar-splashing": ["fl-contracting", "ftc-advertising"],
  "antrias-academy": ["kids-privacy", "ai-music"],
  "religion-relief": ["ai-music"],
  "elevated-remedies": ["ai-music"],
  "kamslam": ["ai-music", "kids-privacy"],
  "palm-polish": ["marketplaces"],
  "the-vendor-space": ["marketplaces"],
  "why-is-this-taxed": ["tax-info"],
  cyberadspace: ["ftc-advertising", "marketplaces", "ai-music"],
};

const emptyLibrary = (): Library => ({ topics: CURRICULUM.map((t) => ({ ...t, rules: [], openIssues: [], sessions: 0 })), questions: [], updates: [] });

export async function readLibrary(): Promise<Library> {
  let lib: Library | null = null;
  try {
    if (LOCAL()) { const b = await fs.readFile(path.join(LOCAL()!, FILE)).catch(() => null); lib = b ? JSON.parse(b.toString("utf8")) : null; }
    else { const res = await get(FILE, { access: "private", useCache: false }); if (res && res.statusCode === 200) lib = JSON.parse(await new Response(res.stream).text()); }
  } catch { lib = null; }
  const base = lib ?? emptyLibrary();
  // add any new curriculum areas
  for (const t of CURRICULUM) if (!base.topics.some((x) => x.key === t.key)) base.topics.push({ ...t, rules: [], openIssues: [], sessions: 0 });
  return base;
}

async function saveLibrary(lib: Library) {
  const data = JSON.stringify(lib);
  if (LOCAL()) { const f = path.join(LOCAL()!, FILE); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data); return; }
  await put(FILE, data, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}

/** The rules the library holds for a brand, for other agents to obey and cite. */
export async function rulesForBrand(slug: string, max = 25): Promise<string> {
  const keys = COUNSEL_TOPICS_FOR[slug] ?? [];
  if (!keys.length) return "";
  const lib = await readLibrary();
  const lines = lib.topics.filter((t) => keys.includes(t.key)).flatMap((t) => t.rules.map((r) => `- ${r.rule} [${r.citation}${r.effective ? `; effective ${r.effective}` : ""}]`));
  return lines.slice(0, max).join("\n");
}

export async function askCounsel(question: string) {
  const lib = await readLibrary();
  lib.questions.unshift({ id: crypto.randomBytes(5).toString("hex"), question: question.slice(0, 1500), askedAt: new Date().toISOString() });
  lib.questions = lib.questions.slice(0, 50);
  await saveLibrary(lib);
}

const METHOD = `You are AI Counsel, the attorney agent for Cyber Ad Space, a Florida studio that runs many small brands. You were trained the way attorneys are trained, and you work the same way:
1. Primary authority first. Read the actual text of the constitution, statutes and regulations that govern the issue (U.S. Code, eCFR, Florida Statutes, Florida Administrative Code). Summaries are only for finding the primary source.
2. Then how it is applied: agency guidance and enforcement (FDA, FTC, state agencies, warning letters) and court decisions (search CourtListener, Justia, Google Scholar). Note which authority is binding in Florida and which is only persuasive, and when federal law preempts state law.
3. Check that the law is still good, like Shepardizing: look for amendments, new rules in the Federal Register, Florida bills and effective dates. Never rely on a rule you haven't confirmed is current.
4. Reason in IRAC: Issue, Rule (with exact citation), Application to this business's real facts, Conclusion with a confidence level.
5. Cite every rule with its exact citation and a link to the official source. If you can't find a primary source, say the rule is unverified.
6. Be decisive and practical: give the conclusion and the safest way to do what the business wants. Flag real risk plainly, with what could happen (warning letter, fine, seizure, lawsuit) and how likely it is.
You are not licensed to practice law and must never present yourself to the public as a lawyer. Your work is legal research for the business owner.`;

type StudyOut = { rules?: { rule?: string; citation?: string; url?: string; kind?: LawRule["kind"]; effective?: string }[]; open_issues?: string[]; summary?: string };
type AnswerOut = { issue?: string; rules?: string[]; application?: string; conclusion?: string; confidence?: string; safest_path?: string };

async function federalRegister(term: string): Promise<{ title: string; url: string }[]> {
  try {
    const u = `https://www.federalregister.gov/api/v1/documents.json?per_page=5&order=newest&conditions[term]=${encodeURIComponent(term)}`;
    const r = await fetch(u, { signal: AbortSignal.timeout(10000) });
    if (!r.ok) return [];
    const j = await r.json();
    return (j?.results ?? []).map((d: { title?: string; html_url?: string; publication_date?: string }) => ({ title: `${d.publication_date}: ${d.title}`, url: d.html_url ?? "" }));
  } catch { return []; }
}

const SEARCH_TERM: Record<string, string> = { "hemp-federal": "hemp", "hemp-food-claims": "cannabidiol", "ftc-advertising": "consumer reviews testimonials", "kids-privacy": "children's online privacy", "ai-music": "copyright artificial intelligence", "marketplaces": "money transmitter", "fl-contracting": "", "hemp-florida": "", "tax-info": "Circular 230" };

/** One study session (or one answer to an owner question). Returns a memo for the crew log. */
export async function runCounselSession(): Promise<{ title: string; body: string }> {
  const lib = await readLibrary();
  const open = lib.questions.find((q) => !q.answer);
  if (open) {
    const context = lib.topics.flatMap((t) => t.rules.map((r) => `- ${r.rule} [${r.citation}]`)).slice(0, 60).join("\n");
    const { data: a, sources } = await researchJSON<AnswerOut>(
      METHOD,
      `The owner asks:\n"${open.question}"\n\nWhat the law library already holds (verify anything you rely on):\n${context || "(empty)"}\n\nResearch it properly, then return {"issue","rules": [each rule with exact citation],"application","conclusion","confidence": "high|medium|low","safest_path": the safest way to get what the owner wants}.`,
    );
    const answer = [`**Issue:** ${a.issue ?? ""}`, `**Rules:**\n${(a.rules ?? []).map((r) => `- ${r}`).join("\n")}`, `**Application:** ${a.application ?? ""}`, `**Conclusion (${a.confidence ?? "?"} confidence):** ${a.conclusion ?? ""}`, `**Safest path:** ${a.safest_path ?? ""}`, sourcesBlock(sources)].join("\n\n");
    const fresh = await readLibrary();
    const q = fresh.questions.find((x) => x.id === open.id);
    if (q) { q.answer = answer; q.answeredAt = new Date().toISOString(); await saveLibrary(fresh); }
    return { title: `Answered: ${open.question.slice(0, 50)}`, body: `Question: ${open.question}\n\n${answer}` };
  }
  // otherwise: a study session on the area studied least recently
  const topic = [...lib.topics].sort((x, y) => (x.lastStudiedAt ?? "").localeCompare(y.lastStudiedAt ?? ""))[0];
  const news = SEARCH_TERM[topic.key] ? await federalRegister(SEARCH_TERM[topic.key]) : [];
  const known = topic.rules.map((r) => `- ${r.rule} [${r.citation}; checked ${r.checkedAt.slice(0, 10)}]`).join("\n");
  const { data: s, sources } = await researchJSON<StudyOut>(
    METHOD,
    `Study session ${topic.sessions + 1}: ${topic.title}.\nScope: ${topic.scope}\n\nWhat you already know (re-verify anything older than 30 days; correct anything wrong):\n${known || "(nothing yet: start with the primary sources)"}\n\nNewest Federal Register documents on this area (check whether any change the rules):\n${news.map((n) => `- ${n.title} ${n.url}`).join("\n") || "(none found)"}\n\nOpen issues from last time:\n${topic.openIssues.join("\n") || "(none)"}\n\nReturn {"rules": [{"rule": one plain-English rule a small business must follow, "citation": exact citation, "url": official source, "kind": "statute"|"regulation"|"guidance"|"case"|"other", "effective": date if relevant}] (the complete, corrected rule set for this area, 5-15 rules), "open_issues": [questions still unresolved], "summary": 2-3 sentences on what changed or what you learned this session}.`,
  );
  const now = new Date().toISOString();
  const fresh = await readLibrary();
  const t = fresh.topics.find((x) => x.key === topic.key)!;
  const rules = (s.rules ?? []).filter((r) => r.rule && r.citation).map((r) => ({ rule: String(r.rule), citation: String(r.citation), url: r.url ? String(r.url) : undefined, kind: (r.kind ?? "other") as LawRule["kind"], effective: r.effective ? String(r.effective) : undefined, checkedAt: now }));
  if (rules.length) t.rules = rules.slice(0, 20);
  t.openIssues = (s.open_issues ?? []).map(String).slice(0, 8);
  t.lastStudiedAt = now; t.sessions += 1;
  for (const n of news) if (n.url && !fresh.updates.some((u) => u.url === n.url)) fresh.updates.unshift({ at: now, title: n.title, url: n.url, topic: topic.key });
  fresh.updates = fresh.updates.slice(0, 40);
  await saveLibrary(fresh);
  const body = [`Studied: ${topic.title} (session ${t.sessions}).`, s.summary ?? "", `## Rules on file (${t.rules.length})\n${t.rules.map((r) => `- ${r.rule} [${r.citation}]`).join("\n")}`, t.openIssues.length ? `## Still open\n${t.openIssues.map((x) => `- ${x}`).join("\n")}` : "", sourcesBlock(sources)].filter(Boolean).join("\n\n");
  return { title: `Studied ${topic.title}`, body };
}

function sourcesBlock(s: Source[]) {
  return s.length ? `Sources:\n${s.slice(0, 15).map((x) => `- ${x.title}: ${x.url}`).join("\n")}` : "Sources: none returned on this run (web search unavailable), so treat this as unverified.";
}
