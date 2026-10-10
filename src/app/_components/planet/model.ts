// Planet CAS data model. Everything here is derived from the two live feeds (/api/crews and /api/arcade)
// plus the static brand list. Nothing is invented: with no real work, every agent is idle.
import { BRANDS } from "@/data/brands";
import { AGENTS, ROOMS, roomForProject, type Room } from "../station/rooms";

export const CAS_LOGO = "/assets/logos/logo-cyberadspace.png";

export type CrewStatus = "working" | "idle" | "standby";
export type PublicCrew = {
  project: { slug: string; name: string; tagline: string; url: string; source: "studio" | "client" };
  agents: { id: string; name: string; job: string; cadence: string; status: CrewStatus; note?: string; lastRunAt?: string }[];
  work: { agent: string; title: string; body: string; at: string }[];
};
export type StepState = "pending" | "running" | "done" | "error";
export type ArcadeOrder = { code: string; label: string; status: string; steps: Record<string, StepState>; updatedAt?: string };
export type ArcadeFeed = { live: boolean; agents: { key: string; label: string }[]; orders: ArcadeOrder[] };

export type AgentStatus = "working" | "idle" | "standby" | "reviewing";

export type PlanetPod = {
  slug: string;
  name: string;
  tagline: string;
  accent: string;
  status: string;
  url: string;
  logo: string | null; // null: draw a lettered badge instead
  district: string;
};

export type PlanetAgent = {
  id: string; // globally unique
  name: string;
  job: string;
  kind: "crew" | "builder" | "reviewer";
  pod: string; // pod slug, "factory" or "deck"
  podName: string; // brand shown in the panel
  district: string;
  color: string;
  logo: string | null;
  badge: string; // letters for a lettered badge when there is no logo
  status: AgentStatus;
  cadence?: string;
  lastRunAt?: string;
  note?: string;
  doing?: string; // real description of current work, only when working
  work?: { title: string; body: string; at: string };
  step?: string;
};

export type District = Room & { street: boolean };

export const DISTRICTS: District[] = ROOMS.map((r) => ({ ...r, street: r.id !== "factory" && r.id !== "deck" }));
/** Order along Main Street, alternating left and right. */
export const STREET_ORDER = ["faith", "music", "civic", "market", "greenhouse", "home", "clients"];
export const districtById = (id: string) => DISTRICTS.find((d) => d.id === id);

const initials = (name: string) => name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
const isCasProject = (slug: string, name: string) => /cyber-?ad-?space|^cas$/i.test(slug) || /^cyber\s?ad\s?space$|^cas$/i.test(name.trim());

/** Pods (brand buildings) on the planet: studio brands from the rooms, plus any project the crew feed adds. */
export function buildPods(crews: PublicCrew[]): PlanetPod[] {
  const pods: PlanetPod[] = [];
  const seen = new Set<string>();
  for (const room of ROOMS) {
    for (const slug of room.brands) {
      const b = BRANDS.find((x) => x.slug === slug);
      if (!b || seen.has(slug)) continue;
      seen.add(slug);
      pods.push({ slug, name: b.name, tagline: b.tagline, accent: b.accent, status: b.status, url: b.url, logo: b.logo, district: room.id });
    }
  }
  for (const c of crews) {
    const p = c.project;
    if (seen.has(p.slug)) continue;
    seen.add(p.slug);
    const brand = BRANDS.find((x) => x.slug === p.slug);
    const cas = isCasProject(p.slug, p.name);
    const district = cas ? "deck" : roomForProject(p.slug, p.source)?.id ?? (p.source === "client" ? "clients" : "deck");
    pods.push({
      slug: p.slug, name: p.name, tagline: p.tagline || brand?.tagline || "",
      accent: brand?.accent ?? "#ffb84d", status: brand?.status ?? "Live", url: p.url || brand?.url || "",
      logo: cas ? CAS_LOGO : brand?.logo ?? null, district,
    });
  }
  return pods;
}

/** Every agent the feeds return, with status taken only from the feeds. */
export function buildAgents(crews: PublicCrew[], arcade: ArcadeFeed | null, pods: PlanetPod[]): PlanetAgent[] {
  const out: PlanetAgent[] = [];
  for (const c of crews) {
    const pod = pods.find((p) => p.slug === c.project.slug);
    if (!pod) continue;
    const cas = isCasProject(c.project.slug, c.project.name);
    for (const a of c.agents) {
      const latest = c.work.filter((w) => w.agent === a.name).sort((x, y) => y.at.localeCompare(x.at))[0];
      out.push({
        id: `${c.project.slug}:${a.id}`, name: a.name, job: a.job, kind: "crew", pod: pod.slug, podName: pod.name,
        district: pod.district, color: pod.accent, logo: cas ? CAS_LOGO : pod.logo, badge: initials(pod.name),
        status: a.status === "working" ? "working" : a.status === "standby" ? "standby" : "idle",
        cadence: a.cadence, lastRunAt: a.lastRunAt, note: a.note,
        doing: a.status === "working" ? `Running now for ${pod.name}` : undefined,
        work: latest ? { title: latest.title, body: latest.body, at: latest.at } : undefined,
      });
    }
  }
  // Brand Factory builders: one per build step, working only when a real order has that step running.
  const orders = arcade?.orders ?? [];
  const steps = arcade?.agents?.length ? arcade.agents : AGENTS.filter((a) => a.kind === "builder").map((a) => ({ key: a.step!, label: a.role }));
  for (const s of steps) {
    const def = AGENTS.find((a) => a.kind === "builder" && a.step === s.key);
    const running = orders.filter((o) => o.steps?.[s.key] === "running");
    const touched = orders.filter((o) => o.steps?.[s.key] && o.steps[s.key] !== "pending").sort((x, y) => (y.updatedAt ?? "").localeCompare(x.updatedAt ?? ""))[0];
    out.push({
      id: `factory:${s.key}`, name: def?.name ?? s.label, job: def?.role ?? s.label, kind: "builder", pod: "factory", podName: "Brand Factory",
      district: "factory", color: def?.color ?? "#ffb84d", logo: CAS_LOGO, badge: "CAS", step: s.key,
      status: running.length ? "working" : "idle",
      note: def?.note,
      doing: running.length ? `${s.label} for ${running.map((o) => o.label).join(", ")}` : undefined,
      lastRunAt: touched?.updatedAt,
    });
  }
  const reviewer = AGENTS.find((a) => a.kind === "person");
  if (reviewer) {
    const inReview = orders.filter((o) => o.status === "review");
    out.push({
      id: "deck:reviewer", name: reviewer.name, job: reviewer.role, kind: "reviewer", pod: "deck", podName: "Cyber Ad Space",
      district: "deck", color: reviewer.color, logo: CAS_LOGO, badge: "CAS",
      status: inReview.length ? "reviewing" : "idle", note: reviewer.note,
      doing: inReview.length ? `Reviewing ${inReview.map((o) => o.label).join(", ")}` : undefined,
    });
  }
  return out;
}

export type PlanetEvent = { id: string; at: number; kind: "handoff" | "review"; from: string; to: string; text: string };

/** Real interactions, found by comparing two consecutive snapshots of the order feed. The first snapshot never produces events. */
export function diffOrders(prev: ArcadeFeed | null, next: ArcadeFeed, agents: PlanetAgent[]): PlanetEvent[] {
  if (!prev) return [];
  const events: PlanetEvent[] = [];
  const keys = next.agents?.length ? next.agents.map((a) => a.key) : ["brief", "names", "kit", "logo", "site", "storefront", "launch"];
  const name = (key: string) => agents.find((a) => a.id === `factory:${key}`)?.name ?? key;
  const now = Date.now();
  for (const o of next.orders) {
    const before = prev.orders.find((x) => x.code === o.code);
    if (!before) continue;
    keys.forEach((k, i) => {
      if (i === 0) return;
      const nowRunning = o.steps?.[k] === "running" && before.steps?.[k] !== "running";
      if (!nowRunning) return;
      // the builder that just finished: the closest earlier step that is done now
      for (let j = i - 1; j >= 0; j--) {
        const pk = keys[j]!;
        if (o.steps?.[pk] === "done") {
          if (before.steps?.[pk] === "done" && before.steps?.[k] === "running") break; // nothing moved
          events.push({ id: `${o.code}:${pk}>${k}:${now}`, at: now, kind: "handoff", from: `factory:${pk}`, to: `factory:${k}`, text: `${name(pk)} handed ${o.label} to ${name(k)}` });
          break;
        }
      }
    });
    if (o.status === "review" && before.status !== "review") {
      const last = [...keys].reverse().find((k) => o.steps?.[k] === "done") ?? keys[keys.length - 1]!;
      events.push({ id: `${o.code}:review:${now}`, at: now, kind: "review", from: `factory:${last}`, to: "deck:reviewer", text: `${o.label} went to the Reviewer` });
    }
  }
  return events;
}

export const STATUS_TEXT: Record<AgentStatus, string> = { working: "Working", idle: "Idle", standby: "Standby", reviewing: "Reviewing" };
export const isBusy = (s: AgentStatus) => s === "working" || s === "reviewing";

export function ago(s?: string) {
  if (!s) return "Not yet";
  const m = Math.max(0, Math.round((Date.now() - Date.parse(s)) / 60000));
  return m < 1 ? "just now" : m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} hr ago` : `${Math.round(m / 1440)} days ago`;
}
