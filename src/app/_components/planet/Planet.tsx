"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./planet.css";
import {
  DISTRICTS, STATUS_TEXT, STREET_ORDER, ago, buildAgents, buildPods, diffOrders, districtById, isBusy,
  type ArcadeFeed, type PlanetAgent, type PlanetEvent, type PlanetPod, type PublicCrew,
} from "./model";
import type { PlanetEngine } from "./engine";

type Panel = { kind: "district"; id: string } | { kind: "agent"; id: string } | null;
type Phase = "landing" | "loading" | "world" | "nogl";

const POLL_MS = 10_000;
const PLACE_ORDER = [...STREET_ORDER, "factory", "deck"];
const timeOf = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" });

function locationText(loc: string) {
  if (loc.startsWith("street:")) {
    const id = loc.slice(7);
    if (id === "arrival") return "Main Street · landing pad";
    if (id === "factory") return "Brand Factory plaza";
    const d = districtById(id);
    return d ? `Main Street · ${d.name} gate` : "Main Street";
  }
  if (loc === "street") return "Main Street";
  const d = districtById(loc);
  return d ? `Inside ${d.name}` : "Main Street";
}

export default function Planet() {
  const [crews, setCrews] = useState<PublicCrew[]>([]);
  const [arcade, setArcade] = useState<ArcadeFeed | null>(null);
  const [feeds, setFeeds] = useState<{ crews: boolean | null; arcade: boolean | null }>({ crews: null, arcade: null });
  const [phase, setPhase] = useState<Phase>("landing");
  const [mode, setMode] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [log, setLog] = useState<PlanetEvent[]>([]);
  const [loc, setLoc] = useState("street:arrival");
  const [coarse, setCoarse] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);
  const engine = useRef<PlanetEngine | null>(null);
  const prevArcade = useRef<ArcadeFeed | null>(null);

  const pods = useMemo(() => buildPods(crews), [crews]);
  const agents = useMemo(() => buildAgents(crews, arcade, pods), [crews, arcade, pods]);
  const agentsRef = useRef<PlanetAgent[]>(agents);
  useEffect(() => { agentsRef.current = agents; }, [agents]);

  // ---- live feeds: the only source of agent state
  useEffect(() => {
    let stop = false, timer: ReturnType<typeof setTimeout> | undefined;
    const pull = async () => {
      const [c, a] = await Promise.allSettled([
        fetch("/api/crews", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
        fetch("/api/arcade", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject(r.status))),
      ]);
      if (stop) return;
      if (c.status === "fulfilled") setCrews(Array.isArray(c.value?.crews) ? c.value.crews : []);
      if (a.status === "fulfilled" && a.value && Array.isArray(a.value.orders)) setArcade(a.value as ArcadeFeed);
      setFeeds({ crews: c.status === "fulfilled", arcade: a.status === "fulfilled" });
    };
    const tick = async () => { if (!document.hidden) await pull(); if (!stop) timer = setTimeout(tick, POLL_MS); };
    const onVis = () => { if (!document.hidden) { clearTimeout(timer); tick(); } };
    tick();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop = true; clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  // ---- real interactions: compare consecutive order snapshots
  useEffect(() => {
    if (!arcade) return;
    const events = diffOrders(prevArcade.current, arcade, agentsRef.current);
    prevArcade.current = arcade;
    if (!events.length) return;
    setLog((l) => [...events.reverse(), ...l].slice(0, 30));
    for (const e of events) engine.current?.event(e);
  }, [arcade]);

  useEffect(() => { engine.current?.sync(pods, agents); }, [pods, agents, phase]);
  useEffect(() => { engine.current?.enter(mode); }, [mode]);
  useEffect(() => { engine.current?.select(panel?.kind === "agent" ? panel.id : null); }, [panel]);
  useEffect(() => () => { engine.current?.dispose(); engine.current = null; }, []);
  useEffect(() => { setCoarse(window.matchMedia("(pointer: coarse)").matches); }, []);

  const enterWorld = useCallback(async () => {
    const test = document.createElement("canvas");
    let gl: RenderingContext | null = null;
    try { gl = test.getContext("webgl2") || test.getContext("webgl"); } catch { gl = null; }
    if (!gl) { setPhase("nogl"); return; }
    setPhase("loading");
    try {
      const { createPlanet } = await import("./engine");
      if (!world.current) return;
      engine.current = createPlanet(world.current, {
        onPickDistrict: (id) => { setMode(id); setPanel({ kind: "district", id }); },
        onPickAgent: (id) => setPanel({ kind: "agent", id }),
        onRequestExit: () => { setMode(null); setPanel(null); },
        onLocation: setLoc,
      }, { reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches, coarse: window.matchMedia("(pointer: coarse)").matches });
      setPhase("world");
      // shareable links: /planet?district=music opens that district on arrival
      const want = new URLSearchParams(window.location.search).get("district");
      if (want && districtById(want)) { setMode(want); setPanel({ kind: "district", id: want }); }
      window.scrollTo({ top: 0 });
    } catch {
      setPhase("nogl");
    }
  }, []);

  const exit = () => { setMode(null); setPanel(null); };
  const working = agents.filter((a) => isBusy(a.status)).length;
  const loaded = feeds.crews !== null;
  const busyOrders = (arcade?.orders ?? []).filter((o) => Object.values(o.steps ?? {}).includes("running")).length;

  const selAgent = panel?.kind === "agent" ? agents.find((a) => a.id === panel.id) : undefined;
  const selDistrict = panel?.kind === "district" ? districtById(panel.id) : undefined;

  return (
    <>
      <div className={`planet-stage is-${phase}`} ref={stage}>
        <div className="planet-world" ref={world} />

        {phase !== "world" && (
          <div className="planet-landing">
            <div className="planet-landing-art" aria-hidden><span className="pl-earth" /><span className="pl-ridge" /></div>
            <div className="planet-landing-copy">
              <div className="eyebrow">Cyber Ad Space · live world</div>
              <h1 className="display planet-title">Come see Planet CAS</h1>
              <p className="planet-lede">Walk down Main Street on our moon. Every brand has its own building, and every agent you meet is a real agent from our live feed, wearing its brand. When one is working you&apos;ll see it at its terminal. When it isn&apos;t, it&apos;s idle, and that&apos;s what you&apos;ll see.</p>
              <Stats loaded={loaded} brands={pods.length} agents={agents.length} working={working} />
              {phase === "nogl" ? (
                <p className="planet-nogl" role="alert">Your browser can&apos;t show the 3D world right now. <Link href="/live">See the moon base map instead →</Link></p>
              ) : (
                <p className="hero-actions planet-actions">
                  <button type="button" className="btn btn-primary" onClick={enterWorld} disabled={phase === "loading"} aria-busy={phase === "loading"}>{phase === "loading" ? "Landing…" : "Enter"}</button>
                  <Link href="/live" className="text-link">Prefer a map? The moon base →</Link>
                </p>
              )}
              <p className="planet-hint">{coarse ? "Drag to look around, use the stick to walk, tap a gate or an agent." : "WASD or arrow keys to walk, drag to look, click a gate, building or agent. Space to hop."}</p>
            </div>
          </div>
        )}

        {phase === "world" && (
          <>
            <div className="planet-hud" aria-live="polite">
              <div className="planet-where">{locationText(mode ?? loc)}</div>
              <Stats loaded={loaded} brands={pods.length} agents={agents.length} working={working} compact />
              {feeds.crews === false && <div className="planet-warn">Crew feed unavailable. Brand agents are hidden until it returns.</div>}
            </div>

            <details className="planet-log" open={!coarse}>
              <summary>Planet log <span>{log.length}</span></summary>
              {log.length ? (
                <ol>{log.map((e) => <li key={e.id}><time>{timeOf(e.at)}</time> {e.text}</li>)}</ol>
              ) : (
                <p>Nothing yet. Hand-offs appear here only when a real order moves from one builder to the next, or goes to the Reviewer.</p>
              )}
            </details>

            {mode && <button type="button" className="planet-exit" onClick={exit}>← Exit to Main Street</button>}

            {panel && (
              <aside className="planet-panel" aria-label={selAgent ? `${selAgent.name} details` : selDistrict ? `${selDistrict.name} details` : "Details"}>
                <button type="button" className="planet-close" onClick={() => setPanel(null)} aria-label="Close panel">×</button>
                {selDistrict && <DistrictPanel id={selDistrict.id} pods={pods} agents={agents} busyOrders={busyOrders} orders={arcade?.orders.length ?? 0} onAgent={(id) => setPanel({ kind: "agent", id })} />}
                {selAgent && (
                  <AgentPanel a={selAgent} inside={mode === selAgent.district}
                    onBack={() => setPanel({ kind: "district", id: selAgent.district })}
                    onGo={() => { setMode(selAgent.district); }} />
                )}
                {!selAgent && !selDistrict && <p className="moon-note">That agent left the feed.</p>}
              </aside>
            )}

            {coarse && <Joystick onMove={(x, y) => engine.current?.setJoystick(x, y)} />}
            {!coarse && !panel && <p className="planet-tip">WASD / arrows to walk · drag to look · click a gate or agent</p>}
          </>
        )}
      </div>

      <section className="site-shell planet-below" aria-labelledby="planet-directory">
        <details className="planet-directory">
          <summary id="planet-directory">Planet directory (text version)</summary>
          <p className="muted">Every district, brand and agent on Planet CAS, with live statuses from the same feeds the 3D world uses.</p>
          <ul>
            {PLACE_ORDER.map((id) => {
              const d = DISTRICTS.find((x) => x.id === id)!;
              const dp = pods.filter((p) => p.district === id), da = agents.filter((a) => a.district === id);
              return (
                <li key={id}>
                  <h3>{d.name}</h3>
                  <p className="muted">{d.blurb}</p>
                  {dp.length > 0 && <ul>{dp.map((p) => (
                    <li key={p.slug}><a href={p.url} target="_blank" rel="noreferrer">{p.name}</a> ({p.status}){p.tagline ? `: ${p.tagline}` : ""}
                      {da.some((a) => a.pod === p.slug) && <ul>{da.filter((a) => a.pod === p.slug).map((a) => <li key={a.id}>{a.name}: {STATUS_TEXT[a.status]}</li>)}</ul>}
                    </li>
                  ))}</ul>}
                  {da.some((a) => a.pod === "factory" || a.pod === "deck") && <ul>{da.filter((a) => a.pod === "factory" || a.pod === "deck").map((a) => <li key={a.id}>{a.name}, {a.job}: {STATUS_TEXT[a.status]}</li>)}</ul>}
                  {!dp.length && !da.length && <p className="muted">Nothing here yet.</p>}
                </li>
              );
            })}
          </ul>
        </details>
      </section>
    </>
  );
}

function Stats({ loaded, brands, agents, working, compact }: { loaded: boolean; brands: number; agents: number; working: number; compact?: boolean }) {
  const n = (x: number) => (loaded ? x : "–");
  return (
    <dl className={`planet-stats${compact ? " is-compact" : ""}`}>
      <div><dt>Brands on the planet</dt><dd>{n(brands)}</dd></div>
      <div><dt>Agents</dt><dd>{n(agents)}</dd></div>
      <div className={working ? "is-on" : ""}><dt>Working now</dt><dd>{n(working)}</dd></div>
    </dl>
  );
}

function DistrictPanel({ id, pods, agents, busyOrders, orders, onAgent }: { id: string; pods: PlanetPod[]; agents: PlanetAgent[]; busyOrders: number; orders: number; onAgent: (id: string) => void }) {
  const d = districtById(id)!;
  const dp = pods.filter((p) => p.district === id), da = agents.filter((a) => a.district === id);
  return (
    <>
      <div className="moon-kicker" style={{ color: d.color }}>{d.street ? "District" : "Landmark"}</div>
      <h2>{d.name}</h2>
      <p>{d.blurb}</p>
      {id === "factory" && <p className="moon-note">Orders in the feed: {orders}. Being built right now: {busyOrders}.{busyOrders ? "" : " With nothing running, every builder is idle."}</p>}
      {dp.length > 0 && (
        <>
          <h3 className="planet-h3">Brands</h3>
          <ul className="planet-brands">
            {dp.map((p) => (
              <li key={p.slug}>
                {p.logo ? <img src={p.logo} alt="" width={40} height={40} loading="lazy" /> : <span className="planet-badge" style={{ borderColor: p.accent, color: p.accent }} aria-hidden>{p.name.slice(0, 1)}</span>}
                <span className="moon-li-main"><b>{p.name}</b><small>{p.tagline}</small><small className="planet-status">{p.status}</small></span>
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="moon-cta">Visit ↗<span className="sr-only"> {p.name}</span></a>}
              </li>
            ))}
          </ul>
        </>
      )}
      {id === "clients" && !dp.length && <p className="moon-note">No client brands have been delivered yet. Each one gets a stall here, with its own crew, the day it&apos;s delivered.</p>}
      <h3 className="planet-h3">Agents</h3>
      {da.length ? (
        <ul className="moon-list">
          {da.map((a) => (
            <li key={a.id}>
              <span className="moon-dot" style={{ background: a.color }} />
              <button type="button" className="planet-agent-btn" onClick={() => onAgent(a.id)}><b>{a.name}</b><small>{a.podName}</small></button>
              <span className={`moon-pill s-${a.status}`}>{STATUS_TEXT[a.status]}</span>
            </li>
          ))}
        </ul>
      ) : <p className="moon-note">No agents in the feed for this area yet.</p>}
    </>
  );
}

function AgentPanel({ a, inside, onBack, onGo }: { a: PlanetAgent; inside: boolean; onBack: () => void; onGo: () => void }) {
  const d = districtById(a.district);
  return (
    <>
      <div className="moon-kicker" style={{ color: a.color }}>{a.podName}</div>
      <h2>{a.name}</h2>
      <p><span className={`moon-pill s-${a.status}`}>{STATUS_TEXT[a.status]}</span></p>
      <p>{a.job}</p>
      {a.doing && <p className="planet-doing">{a.doing}</p>}
      <dl className="planet-facts">
        {a.cadence && <div><dt>Runs</dt><dd>{a.cadence}</dd></div>}
        <div><dt>{a.kind === "builder" ? "Last order activity" : "Last run"}</dt><dd>{a.kind === "reviewer" ? "Checks builds as they arrive" : ago(a.lastRunAt)}</dd></div>
        {a.note && <div><dt>Note</dt><dd>{a.note}</dd></div>}
      </dl>
      {a.kind === "crew" && (a.work ? (
        <div className="planet-work">
          <h3 className="planet-h3">Latest approved work</h3>
          <b>{a.work.title}</b> <small className="muted">{ago(a.work.at)}</small>
          <details><summary>Read it</summary><p className="planet-work-body">{a.work.body}</p></details>
        </div>
      ) : <p className="moon-note">No approved work to show yet. Drafts stay private until a person approves them.</p>)}
      <p className="planet-panel-actions">
        {d && <button type="button" className="text-link" onClick={onBack}>← {d.name}</button>}
        {!inside && d && <button type="button" className="btn" onClick={onGo}>Go to {d.name}</button>}
      </p>
    </>
  );
}

function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const base = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const active = useRef<number | null>(null);
  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect(), R = r.width / 2;
    let x = e.clientX - (r.left + R), y = e.clientY - (r.top + R);
    const d = Math.hypot(x, y); if (d > R) { x = (x / d) * R; y = (y / d) * R; }
    setKnob({ x, y });
    const dz = (v: number) => (Math.abs(v) < 0.12 ? 0 : v);
    onMove(dz(x / R), dz(y / R));
  };
  const end = () => { active.current = null; setKnob({ x: 0, y: 0 }); onMove(0, 0); };
  return (
    <div className="planet-joy" ref={base} aria-hidden
      onPointerDown={(e) => { active.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); update(e); }}
      onPointerMove={(e) => { if (active.current === e.pointerId) update(e); }}
      onPointerUp={end} onPointerCancel={end}>
      <span style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
