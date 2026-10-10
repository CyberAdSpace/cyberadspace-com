// CAS Security Auditor: checks every Cyber Ad Space site every day.
// Uptime, certificates, broken links and assets, forms, exposed files, leaked keys, mixed content,
// security headers, speed, contact info, and whether the page matches its brand's fact sheet.
// Full results stay private (admin page + email). Only a one-line summary is ever shown publicly.
import tls from "node:tls";
import { put, get } from "@vercel/blob";
import fs from "node:fs/promises";
import path from "node:path";
import { aiConfigured, chatJSON } from "./ai";
import { factSheetText, FACTS } from "@/data/factsheets";
import { sendMail, STUDIO_INBOX, siteUrl } from "./mail";

export type CheckStatus = "pass" | "info" | "warn" | "fail";
export type Check = { id: string; label: string; status: CheckStatus; detail: string };
export type SiteAudit = { slug: string; name: string; url: string; at: string; pagesChecked: number; ms: number; checks: Check[]; grade: "clear" | "attention" | "problem" };
export type AuditReport = { at: string; sites: SiteAudit[]; summary: { sites: number; clear: number; attention: number; problem: number; pagesChecked: number } };
export type AuditTarget = { slug: string; name: string; url: string };

const UA = "CyberAdSpace Security Auditor (+https://cyberadspace.com)";
const LOCAL = () => process.env.LOCAL_STORE_DIR;

// ---------- storage ----------
async function writeJSON(p: string, data: unknown) {
  const body = JSON.stringify(data);
  if (LOCAL()) { const f = path.join(LOCAL()!, p); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, body); return; }
  await put(p, body, { access: "private", contentType: "application/json", addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: 60 });
}
export async function latestAudit(): Promise<AuditReport | null> {
  try {
    if (LOCAL()) { const b = await fs.readFile(path.join(LOCAL()!, "audits/latest.json")).catch(() => null); return b ? JSON.parse(b.toString("utf8")) : null; }
    const res = await get("audits/latest.json", { access: "private", useCache: false });
    if (!res || res.statusCode !== 200) return null;
    return JSON.parse(await new Response(res.stream).text());
  } catch { return null; }
}

// ---------- helpers ----------
type Fetched = { ok: boolean; status: number; ms: number; headers: Headers | null; text: string; finalUrl: string; error?: string };

async function fetchText(url: string, opts: { method?: string; timeout?: number; maxBytes?: number } = {}): Promise<Fetched> {
  const t0 = Date.now();
  try {
    const res = await fetch(url, { method: opts.method ?? "GET", redirect: "follow", headers: { "User-Agent": UA, Accept: "*/*" }, signal: AbortSignal.timeout(opts.timeout ?? 12000), cache: "no-store" });
    let text = "";
    if ((opts.method ?? "GET") === "GET" && res.body) {
      const reader = res.body.getReader();
      const max = opts.maxBytes ?? 2_000_000;
      let got = 0; const chunks: Uint8Array[] = [];
      for (;;) { const { done, value } = await reader.read(); if (done) break; chunks.push(value); got += value.length; if (got >= max) { await reader.cancel().catch(() => undefined); break; } }
      text = new TextDecoder().decode(Buffer.concat(chunks.map((c) => Buffer.from(c))));
    }
    return { ok: res.ok, status: res.status, ms: Date.now() - t0, headers: res.headers, text, finalUrl: res.url || url };
  } catch (e) {
    return { ok: false, status: 0, ms: Date.now() - t0, headers: null, text: "", finalUrl: url, error: e instanceof Error ? e.message : String(e) };
  }
}

function certDaysLeft(host: string): Promise<{ days: number; issuer: string } | { error: string }> {
  return new Promise((resolve) => {
    const sock = tls.connect({ host, port: 443, servername: host, timeout: 8000 }, () => {
      const c = sock.getPeerCertificate();
      sock.end();
      if (!c || !c.valid_to) return resolve({ error: "no certificate returned" });
      resolve({ days: Math.floor((Date.parse(c.valid_to) - Date.now()) / 864e5), issuer: String((c.issuer as { O?: string })?.O ?? "") });
    });
    sock.on("error", (e) => resolve({ error: e.message }));
    sock.on("timeout", () => { sock.destroy(); resolve({ error: "timed out" }); });
  });
}

function attrValues(html: string, tag: string, attr: string): string[] {
  const out: string[] = [];
  const re = new RegExp(`<${tag}\\b[^>]*?\\s${attr}\\s*=\\s*["']([^"']+)["']`, "gi");
  for (let m = re.exec(html); m; m = re.exec(html)) out.push(m[1]);
  return out;
}

function visibleText(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

const SECRET_PATTERNS: [string, RegExp][] = [
  ["Stripe live secret key", /\b(sk|rk)_live_[0-9a-zA-Z]{16,}/],
  ["OpenAI API key", /\bsk-(proj-)?[A-Za-z0-9_-]{32,}/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["Private key block", /-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----/],
  ["Slack token", /\bxox[baprs]-[0-9A-Za-z-]{10,}/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9]{30,}/],
  ["Vercel Blob write token", /\bvercel_blob_rw_[A-Za-z0-9_]{20,}/],
];

const PROBES: { path: string; label: string; looksExposed: (t: string) => boolean }[] = [
  { path: "/.env", label: ".env file", looksExposed: (t) => /^[A-Z0-9_]{3,}\s*=/m.test(t) },
  { path: "/.git/config", label: "Git config", looksExposed: (t) => /\[core\]/.test(t) },
  { path: "/.git/HEAD", label: "Git HEAD", looksExposed: (t) => /^ref:\s*refs\//m.test(t) },
];

// ---------- one site ----------
export async function auditSite(t: AuditTarget): Promise<SiteAudit> {
  const t0 = Date.now();
  const checks: Check[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string) => checks.push({ id, label, status, detail });
  let pages = 0;

  const home = await fetchText(t.url, { timeout: 15000 });
  pages++;
  if (!home.ok) {
    add("uptime", "Site is up", "fail", home.status ? `Home page returned ${home.status}.` : `Home page didn't answer: ${home.error}.`);
    return finish();
  }
  add("uptime", "Site is up", "pass", `Home page answered ${home.status} in ${home.ms} ms.`);
  add("speed", "Home page speed", home.ms > 4000 ? "warn" : "pass", `${home.ms} ms to load the home page HTML.`);

  const base = new URL(home.finalUrl);
  if (base.protocol !== "https:") add("https", "HTTPS", "fail", "The site doesn't end up on HTTPS.");
  else {
    const cert = await certDaysLeft(base.hostname);
    if ("error" in cert) add("cert", "Security certificate", "warn", `Couldn't read the certificate: ${cert.error}.`);
    else add("cert", "Security certificate", cert.days < 7 ? "fail" : cert.days < 21 ? "warn" : "pass", `Valid for ${cert.days} more days${cert.issuer ? ` (issued by ${cert.issuer})` : ""}.`);
  }

  // headers
  const h = home.headers!;
  const csp = h.get("content-security-policy") ?? "";
  add("hsts", "Forces HTTPS (HSTS)", h.get("strict-transport-security") ? "pass" : "info", h.get("strict-transport-security") ? "Set." : "Not set. Browsers may load the site over plain HTTP first.");
  add("nosniff", "File-type protection", h.get("x-content-type-options") ? "pass" : "info", h.get("x-content-type-options") ? "Set." : "x-content-type-options isn't set.");
  add("frame", "Clickjacking protection", h.get("x-frame-options") || /frame-ancestors/.test(csp) ? "pass" : "info", h.get("x-frame-options") || /frame-ancestors/.test(csp) ? "Set." : "Other sites could show this site inside a frame.");
  add("csp", "Content Security Policy", csp ? "pass" : "info", csp ? "Set." : "No Content Security Policy.");

  // mixed content
  const insecure = [...attrValues(home.text, "script", "src"), ...attrValues(home.text, "img", "src"), ...attrValues(home.text, "link", "href"), ...attrValues(home.text, "iframe", "src")].filter((u) => u.startsWith("http://"));
  add("mixed", "No insecure (http://) resources", insecure.length ? "warn" : "pass", insecure.length ? `${insecure.length} resource${insecure.length === 1 ? "" : "s"} load over plain HTTP, e.g. ${insecure[0].slice(0, 80)}.` : "All resources load over HTTPS.");

  // links and assets
  const resolve = (u: string) => { try { return new URL(u, base); } catch { return null; } };
  const hrefs = attrValues(home.text, "a", "href").filter((u) => !/^(mailto:|tel:|sms:|javascript:|#)/i.test(u));
  const internal = new Set<string>(), external = new Set<string>();
  for (const u of hrefs) { const x = resolve(u); if (!x || !/^https?:$/.test(x.protocol)) continue; x.hash = ""; (x.host === base.host ? internal : external).add(x.toString()); }
  const assets = new Set<string>();
  for (const u of [...attrValues(home.text, "script", "src"), ...attrValues(home.text, "img", "src"), ...attrValues(home.text, "link", "href")]) { const x = resolve(u); if (x && x.host === base.host) assets.add(x.toString()); }

  const internalList = [...internal].filter((u) => u !== base.toString()).slice(0, 20);
  const assetList = [...assets].slice(0, 25);
  const externalList = [...external].slice(0, 10);
  const [intRes, assetRes, extRes] = await Promise.all([
    Promise.all(internalList.map((u) => fetchText(u, { maxBytes: 300_000 }).then((r) => ({ u, r })))),
    Promise.all(assetList.map((u) => fetchText(u, { maxBytes: 2_000_000 }).then((r) => ({ u, r })))),
    Promise.all(externalList.map((u) => fetchText(u, { timeout: 8000, maxBytes: 50_000 }).then((r) => ({ u, r })))),
  ]);
  pages += intRes.length;
  const brokenInt = intRes.filter(({ r }) => r.status >= 400 || r.status === 0);
  add("links", "Internal links work", brokenInt.length ? "fail" : "pass", brokenInt.length ? `${brokenInt.length} of ${intRes.length} broken: ${brokenInt.slice(0, 4).map(({ u, r }) => `${new URL(u).pathname} (${r.status || "no answer"})`).join(", ")}.` : `${intRes.length} internal page${intRes.length === 1 ? "" : "s"} checked.`);
  const brokenAssets = assetRes.filter(({ r }) => r.status >= 400 || r.status === 0);
  add("assets", "Images, scripts and styles load", brokenAssets.length ? "fail" : "pass", brokenAssets.length ? `${brokenAssets.length} missing: ${brokenAssets.slice(0, 4).map(({ u, r }) => `${new URL(u).pathname} (${r.status || "no answer"})`).join(", ")}.` : `${assetRes.length} files checked.`);
  const brokenExt = extRes.filter(({ r }) => (r.status >= 400 && ![401, 403, 405, 429, 999].includes(r.status)) || r.status === 0);
  add("external", "Outbound links work", brokenExt.length ? "warn" : "pass", brokenExt.length ? `${brokenExt.length} may be broken: ${brokenExt.slice(0, 3).map(({ u, r }) => `${new URL(u).host} (${r.status || "no answer"})`).join(", ")}.` : `${extRes.length} checked.`);

  // forms
  const actions = attrValues(home.text, "form", "action");
  const formRes = await Promise.all(actions.slice(0, 5).map(async (a) => { const x = resolve(a); if (!x) return null; const r = await fetchText(x.toString(), { maxBytes: 20_000 }); return { a: x.toString(), r }; }));
  const badForms = formRes.filter((f): f is { a: string; r: Fetched } => !!f && (f.r.status === 404 || f.r.status === 0));
  if (actions.length) add("forms", "Forms point somewhere real", badForms.length ? "fail" : "pass", badForms.length ? `Form posts to ${badForms[0].a} which ${badForms[0].r.status === 404 ? "doesn't exist (404)" : "didn't answer"}.` : `${actions.length} form${actions.length === 1 ? "" : "s"} checked.`);

  // exposed files
  const probes = await Promise.all(PROBES.map(async (p) => { const r = await fetchText(new URL(p.path, base).toString(), { maxBytes: 20_000 }); return { p, exposed: r.status === 200 && !/<html/i.test(r.text) && p.looksExposed(r.text) }; }));
  const exposed = probes.filter((x) => x.exposed);
  add("exposed", "No private files exposed", exposed.length ? "fail" : "pass", exposed.length ? `Publicly readable: ${exposed.map((x) => x.p.label).join(", ")}. Remove them now.` : ".env and Git files aren't reachable.");

  // leaked keys in the page and its own scripts
  const scripts = assetRes.filter(({ u }) => /\.m?js(\?|$)/.test(u)).map(({ r }) => r.text);
  const haystack = [home.text, ...scripts].join("\n");
  const leaks = SECRET_PATTERNS.filter(([, re]) => re.test(haystack)).map(([name]) => name);
  add("secrets", "No secret keys in the code visitors download", leaks.length ? "fail" : "pass", leaks.length ? `Found what looks like: ${leaks.join(", ")}. Rotate the key and remove it from the site.` : `Page and ${scripts.length} script file${scripts.length === 1 ? "" : "s"} scanned.`);

  // contact
  const contact = (FACTS[t.slug]?.contact ?? "").toLowerCase();
  const lower = home.text.toLowerCase();
  if (contact) add("contact", "Contact email shown", lower.includes(contact) ? "pass" : "warn", lower.includes(contact) ? `${FACTS[t.slug]!.contact} is on the home page.` : `${FACTS[t.slug]!.contact} isn't on the home page.`);
  else add("contact", "Contact email shown", /mailto:/i.test(home.text) ? "pass" : "warn", /mailto:/i.test(home.text) ? "An email link is on the home page." : "No email link on the home page.");

  // fact sheet consistency
  const facts = factSheetText(t.slug);
  if (facts && aiConfigured()) {
    try {
      const r = await chatJSON<{ issues?: { severity?: string; problem?: string; quote?: string }[] }>(
        "You audit a brand's live home page against its official fact sheet. Report ONLY real problems: statements on the page that contradict the fact sheet, anything the fact sheet's 'Never say or imply' list forbids, health or medical claims, invented statistics or reviews, and dates that contradict the fact sheet. Don't report style issues or missing information. Return {\"issues\": [{\"severity\": \"fail\" | \"warn\", \"problem\": short plain sentence, \"quote\": exact short quote from the page}]}. Return an empty list if the page is consistent.",
        `FACT SHEET for ${t.name}:\n${facts}\n\nHOME PAGE TEXT:\n${visibleText(home.text).slice(0, 7000)}`,
      );
      const issues = (r.issues ?? []).filter((i) => i.problem).slice(0, 5);
      add("facts", "Page matches the fact sheet", issues.some((i) => i.severity === "fail") ? "fail" : issues.length ? "warn" : "pass", issues.length ? issues.map((i) => `${i.problem}${i.quote ? ` ("${String(i.quote).slice(0, 90)}")` : ""}`).join(" · ") : "No contradictions found.");
    } catch (e) {
      add("facts", "Page matches the fact sheet", "info", `Couldn't run the check: ${e instanceof Error ? e.message : String(e)}.`);
    }
  }
  return finish();

  function finish(): SiteAudit {
    const grade = checks.some((c) => c.status === "fail") ? "problem" : checks.some((c) => c.status === "warn") ? "attention" : "clear";
    return { slug: t.slug, name: t.name, url: t.url, at: new Date().toISOString(), pagesChecked: pages, ms: Date.now() - t0, checks, grade };
  }
}

// ---------- all sites ----------
export async function runAudit(targets: AuditTarget[]): Promise<AuditReport> {
  const queue = [...targets];
  const sites: SiteAudit[] = [];
  const worker = async () => {
    for (let t = queue.shift(); t; t = queue.shift()) {
      const tt = t;
      const res = await Promise.race([
        auditSite(tt),
        new Promise<SiteAudit>((r) => setTimeout(() => r({ slug: tt.slug, name: tt.name, url: tt.url, at: new Date().toISOString(), pagesChecked: 0, ms: 70000, grade: "attention", checks: [{ id: "timeout", label: "Audit finished", status: "warn", detail: "The audit ran out of time for this site." }] }), 70000)),
      ]);
      sites.push(res);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  sites.sort((a, b) => ({ problem: 0, attention: 1, clear: 2 })[a.grade] - ({ problem: 0, attention: 1, clear: 2 })[b.grade] || a.name.localeCompare(b.name));
  const report: AuditReport = {
    at: new Date().toISOString(),
    sites,
    summary: { sites: sites.length, clear: sites.filter((s) => s.grade === "clear").length, attention: sites.filter((s) => s.grade === "attention").length, problem: sites.filter((s) => s.grade === "problem").length, pagesChecked: sites.reduce((n, s) => n + s.pagesChecked, 0) },
  };
  await writeJSON("audits/latest.json", report);
  await writeJSON(`audits/${report.at.slice(0, 10)}.json`, report);

  const flagged = sites.filter((s) => s.grade !== "clear");
  await sendMail({
    to: STUDIO_INBOX,
    subject: flagged.length ? `Security audit: ${flagged.length} site${flagged.length === 1 ? "" : "s"} need${flagged.length === 1 ? "s" : ""} attention` : `Security audit: all ${sites.length} sites clear`,
    text: `Checked ${sites.length} sites and ${report.summary.pagesChecked} pages.\n\n${flagged.map((s) => `${s.name} (${s.url}): ${s.grade === "problem" ? "PROBLEM" : "attention"}\n${s.checks.filter((c) => c.status === "fail" || c.status === "warn").map((c) => `  - ${c.status === "fail" ? "FAIL" : "warn"}: ${c.label}. ${c.detail}`).join("\n")}`).join("\n\n") || "Nothing to fix today."}\n\nFull report: ${siteUrl()}/admin/audit`,
  }).catch(() => undefined);
  return report;
}

export function publicSummary(r: AuditReport) {
  const s = r.summary;
  return {
    title: s.problem || s.attention ? `Audit: ${s.clear} of ${s.sites} sites clear` : `Audit: all ${s.sites} sites clear`,
    body: `Checked ${s.sites} sites and ${s.pagesChecked} pages for downtime, certificates, broken links, exposed files, leaked keys and claims that don't match each brand's fact sheet. ${s.problem + s.attention ? `${s.problem + s.attention} site${s.problem + s.attention === 1 ? " needs" : "s need"} attention; details are with the Cyber Ad Space team.` : "Nothing needs attention."}`,
  };
}
