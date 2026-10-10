"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BRANDS } from "@/data/brands";
import { AGENTS, ROOMS, WORLD, brandsFor, type AgentDef, type Room } from "./rooms";

type StepState = "pending" | "running" | "done" | "error";
type Feed = { live: boolean; orders: { code: string; status: string; steps: Record<string, StepState> }[] };
type Status = "working" | "idle" | "oncall" | "reviewing";
type Sel = { kind: "room"; id: string } | { kind: "agent"; id: string } | null;

const STATUS_TEXT: Record<Status, string> = { working: "Working", idle: "Idle", oncall: "On call", reviewing: "Reviewing" };

// 7x9 astronaut: 1 = suit, 2 = visor
const ASTRO = ["0011100", "0122210", "0122210", "0011100", "1111111", "1011101", "0011100", "0110110", "0110110"];

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const roomById = (id: string) => ROOMS.find((r) => r.id === id)!;

/** Workstation spots around the factory, one per builder. */
function stationSpot(i: number) {
  const f = roomById("factory");
  const a = -Math.PI / 2 + (i / 7) * Math.PI * 2;
  return { x: f.x + Math.cos(a) * f.r * 0.62, y: f.y + Math.sin(a) * f.r * 0.62 };
}

/** Brand pod positions inside a dome. */
function podSpot(room: Room, i: number, n: number) {
  if (n === 1) return { x: room.x, y: room.y - room.r * 0.15 };
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2 + (n === 2 ? Math.PI / 2 : 0);
  return { x: room.x + Math.cos(a) * room.r * 0.52, y: room.y + Math.sin(a) * room.r * 0.52 };
}

function buildTerrain(): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = WORLD.w; c.height = WORLD.h;
  const g = c.getContext("2d")!;
  const rnd = seeded(7);
  // regolith base
  const base = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, 100, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.75);
  base.addColorStop(0, "#4a4d55"); base.addColorStop(1, "#2b2d33");
  g.fillStyle = base; g.fillRect(0, 0, WORLD.w, WORLD.h);
  // grain
  for (let i = 0; i < 9000; i++) {
    const v = rnd();
    g.fillStyle = v > 0.5 ? `rgba(255,255,255,${0.02 + rnd() * 0.04})` : `rgba(0,0,0,${0.04 + rnd() * 0.06})`;
    g.fillRect(rnd() * WORLD.w, rnd() * WORLD.h, 1 + rnd() * 2, 1 + rnd() * 2);
  }
  // craters, kept off the domes
  for (let i = 0; i < 70; i++) {
    const r = 6 + Math.pow(rnd(), 2.2) * 70;
    const x = rnd() * WORLD.w, y = rnd() * WORLD.h;
    if (ROOMS.some((d) => Math.hypot(d.x - x, d.y - y) < d.r + r + 20)) continue;
    const cg = g.createRadialGradient(x - r * 0.25, y - r * 0.25, r * 0.1, x, y, r);
    cg.addColorStop(0, "rgba(20,21,25,.55)"); cg.addColorStop(0.8, "rgba(30,31,36,.35)"); cg.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = cg; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(210,214,224,.16)"; g.lineWidth = Math.max(1, r * 0.08);
    g.beginPath(); g.arc(x, y, r * 0.92, Math.PI * 0.15, Math.PI * 1.05); g.stroke();
  }
  // rover tracks from the factory to every dome
  const f = roomById("factory");
  g.setLineDash([5, 7]);
  for (const d of ROOMS) {
    if (d.id === "factory") continue;
    const ang = Math.atan2(d.y - f.y, d.x - f.x), nx = -Math.sin(ang) * 6, ny = Math.cos(ang) * 6;
    for (const s of [-1, 1]) {
      g.strokeStyle = "rgba(20,21,25,.55)"; g.lineWidth = 3;
      g.beginPath(); g.moveTo(f.x + nx * s, f.y + ny * s); g.lineTo(d.x + nx * s, d.y + ny * s); g.stroke();
    }
  }
  g.setLineDash([]);
  // edge vignette into space
  const v = g.createRadialGradient(WORLD.w / 2, WORLD.h / 2, WORLD.h * 0.45, WORLD.w / 2, WORLD.h / 2, WORLD.w * 0.7);
  v.addColorStop(0, "rgba(5,7,15,0)"); v.addColorStop(1, "rgba(5,7,15,.85)");
  g.fillStyle = v; g.fillRect(0, 0, WORLD.w, WORLD.h);
  return c;
}

type Walker = { x: number; y: number; tx: number; ty: number; wait: number; face: number };

export default function MoonBase() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [sel, setSel] = useState<Sel>(null);
  const status = useRef<Record<string, Status>>({});
  const cam = useRef({ x: 0, y: 0, s: 0.5, fit: true });
  const hover = useRef<string | null>(null);
  const selRef = useRef<Sel>(null);
  const buildingRef = useRef(0);
  useEffect(() => { selRef.current = sel; }, [sel]);

  useEffect(() => {
    let stop = false;
    const pull = async () => { try { const r = await fetch("/api/arcade", { cache: "no-store" }); if (r.ok && !stop) setFeed(await r.json()); } catch { /* keep last */ } };
    pull();
    const id = setInterval(pull, 5000);
    return () => { stop = true; clearInterval(id); };
  }, []);

  // Agent status from real orders.
  const statuses = useMemo(() => {
    const out: Record<string, Status> = {};
    const orders = feed?.orders ?? [];
    for (const a of AGENTS) {
      if (a.kind === "builder") out[a.id] = orders.some((o) => o.steps[a.step!] === "running") ? "working" : "idle";
      else if (a.kind === "person") out[a.id] = orders.some((o) => o.status === "review") ? "reviewing" : "idle";
      else out[a.id] = "oncall";
    }
    return out;
  }, [feed]);
  useEffect(() => { status.current = statuses; }, [statuses]);

  const building = (feed?.orders ?? []).filter((o) => o.status === "queued" || o.status === "generating" || Object.values(o.steps).includes("running")).length;
  useEffect(() => { buildingRef.current = building; }, [building]);
  const working = AGENTS.filter((a) => a.kind === "builder" && statuses[a.id] === "working").length;
  const liveBrands = BRANDS.filter((b) => b.status.startsWith("Live")).length;

  useEffect(() => {
    const c = canvas.current, wrap = box.current;
    if (!c || !wrap) return;
    const ctx = c.getContext("2d")!;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const terrain = buildTerrain();
    const rnd = seeded(42);
    const stars = Array.from({ length: 160 }, () => ({ x: rnd(), y: rnd(), r: rnd() * 1.4 + 0.3, t: rnd() * 6 }));

    const walkers: Record<string, Walker> = {};
    const pick = (a: AgentDef, w: Walker) => {
      const room = roomById(a.room);
      const ang = Math.random() * Math.PI * 2, dist = Math.random() * room.r * (a.room === "factory" ? 0.35 : 0.7);
      w.tx = room.x + Math.cos(ang) * dist; w.ty = room.y + Math.sin(ang) * dist; w.wait = 1 + Math.random() * 3;
    };
    AGENTS.forEach((a) => { const r = roomById(a.room); const w: Walker = { x: r.x, y: r.y, tx: r.x, ty: r.y, wait: 0, face: 1 }; pick(a, w); w.x = w.tx; w.y = w.ty; walkers[a.id] = w; });

    const fit = () => {
      const W = wrap.clientWidth, H = wrap.clientHeight;
      const whole = Math.min(W / WORLD.w, H / WORLD.h) * 1.02;
      const s = W < 700 ? Math.max(whole, 0.48) : whole; // phones start zoomed in on the factory
      const f = roomById("factory");
      const fx = W < 700 ? f.x : WORLD.w / 2, fy = W < 700 ? f.y - 40 : WORLD.h / 2;
      cam.current = { x: fx - W / 2 / s, y: fy - H / 2 / s, s, fit: true };
    };

    let raf = 0, last = performance.now();
    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const dpr = window.devicePixelRatio || 1, W = wrap.clientWidth, H = wrap.clientHeight;
      if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); if (cam.current.fit) fit(); }
      const t = still ? 0 : now / 1000;
      const sel = selRef.current, building = buildingRef.current;
      const { x: cx, y: cy, s } = cam.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "#05070f"; ctx.fillRect(0, 0, W, H);
      for (const st of stars) { ctx.fillStyle = `rgba(226,230,237,${0.35 + 0.35 * Math.sin(t * 1.5 + st.t)})`; ctx.fillRect(st.x * W, st.y * H, st.r, st.r); }

      ctx.setTransform(dpr * s, 0, 0, dpr * s, -cx * s * dpr, -cy * s * dpr);
      ctx.drawImage(terrain, 0, 0);

      // domes
      for (const d of ROOMS) {
        const sel1 = sel?.kind === "room" && sel.id === d.id, hov = hover.current === "room:" + d.id;
        ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.beginPath(); ctx.ellipse(d.x + 14, d.y + 18, d.r, d.r * 0.96, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#14171f"; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.fill();
        // floor grid
        ctx.save(); ctx.beginPath(); ctx.arc(d.x, d.y, d.r - 6, 0, Math.PI * 2); ctx.clip();
        ctx.strokeStyle = "rgba(255,255,255,.05)"; ctx.lineWidth = 1;
        for (let gx = d.x - d.r; gx < d.x + d.r; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, d.y - d.r); ctx.lineTo(gx, d.y + d.r); ctx.stroke(); }
        for (let gy = d.y - d.r; gy < d.y + d.r; gy += 24) { ctx.beginPath(); ctx.moveTo(d.x - d.r, gy); ctx.lineTo(d.x + d.r, gy); ctx.stroke(); }
        const glass = ctx.createRadialGradient(d.x - d.r * 0.35, d.y - d.r * 0.4, d.r * 0.05, d.x, d.y, d.r);
        glass.addColorStop(0, "rgba(180,215,255,.16)"); glass.addColorStop(0.6, "rgba(127,191,255,.04)"); glass.addColorStop(1, "rgba(127,191,255,.10)");
        ctx.fillStyle = glass; ctx.fillRect(d.x - d.r, d.y - d.r, d.r * 2, d.r * 2);
        ctx.restore();
        ctx.strokeStyle = d.color; ctx.globalAlpha = sel1 || hov ? 1 : 0.7; ctx.lineWidth = sel1 ? 7 : 5;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
        // airlock toward the factory
        if (d.id !== "factory") {
          const f = roomById("factory"), a = Math.atan2(f.y - d.y, f.x - d.x);
          ctx.fillStyle = d.color; ctx.save(); ctx.translate(d.x + Math.cos(a) * d.r, d.y + Math.sin(a) * d.r); ctx.rotate(a); ctx.fillRect(-6, -12, 16, 24); ctx.restore();
        }
        ctx.font = "700 20px ui-monospace, Menlo, monospace"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
        ctx.fillStyle = d.color; ctx.fillText(d.name.toUpperCase(), d.x, d.y - d.r - 16);

        // brand pods
        const bs = brandsFor(d);
        bs.forEach((b, i) => {
          const p = podSpot(d, i, bs.length);
          const hv = hover.current === "brand:" + b.slug;
          ctx.fillStyle = "#0b0e16"; ctx.strokeStyle = b.accent; ctx.lineWidth = hv ? 4 : 2.5;
          ctx.beginPath(); ctx.roundRect(p.x - 30, p.y - 24, 60, 44, 8); ctx.fill(); ctx.stroke();
          const glow = 0.55 + 0.25 * Math.sin(t * 2 + i);
          ctx.fillStyle = b.accent; ctx.globalAlpha = glow; ctx.fillRect(p.x - 22, p.y - 16, 44, 22); ctx.globalAlpha = 1;
          ctx.fillStyle = "#0b0e16"; ctx.fillRect(p.x - 18, p.y - 10, 20, 3); ctx.fillRect(p.x - 18, p.y - 4, 30, 3);
          ctx.fillStyle = b.status.startsWith("Live") ? "#5fd39a" : "#9aa3b8"; ctx.beginPath(); ctx.arc(p.x + 22, p.y + 13, 3.5, 0, Math.PI * 2); ctx.fill();
          ctx.font = "600 13px system-ui, sans-serif"; ctx.fillStyle = "#e2e6ed";
          ctx.fillText(b.name.length > 20 ? b.name.slice(0, 19) + "…" : b.name, p.x, p.y + 40);
        });

        // factory workstations
        if (d.id === "factory") {
          AGENTS.filter((a) => a.kind === "builder").forEach((a, i) => {
            const p = stationSpot(i), busy = status.current[a.id] === "working";
            ctx.fillStyle = "#0b0e16"; ctx.strokeStyle = busy ? "#ffb84d" : "rgba(226,230,237,.3)"; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.roundRect(p.x - 22, p.y - 26, 44, 16, 4); ctx.fill(); ctx.stroke();
            if (busy) { ctx.fillStyle = "#ffb84d"; ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 6 + i)); ctx.fillRect(p.x - 18, p.y - 22, 36, 8); ctx.globalAlpha = 1; }
          });
          ctx.font = "600 13px ui-monospace, Menlo, monospace"; ctx.fillStyle = building ? "#ffb84d" : "#9aa3b8";
          ctx.fillText(building ? `${building} BUILD${building === 1 ? "" : "S"} LIVE` : "AWAITING ORDERS", d.x, d.y + d.r * 0.88);
        }
      }

      // agents
      for (const a of AGENTS) {
        const w = walkers[a.id], st = status.current[a.id];
        if (a.kind === "builder" && st === "working") { const p = stationSpot(AGENTS.filter((x) => x.kind === "builder").indexOf(a)); w.tx = p.x; w.ty = p.y; w.wait = 0.5; }
        if (!still) {
          const dx = w.tx - w.x, dy = w.ty - w.y, dist = Math.hypot(dx, dy);
          if (dist > 1.5) { const sp = (st === "working" ? 70 : 28) * dt; w.x += (dx / dist) * Math.min(sp, dist); w.y += (dy / dist) * Math.min(sp, dist); if (Math.abs(dx) > 0.5) w.face = dx > 0 ? 1 : -1; }
          else if (st !== "working") { w.wait -= dt; if (w.wait <= 0) pick(a, w); }
        }
        const moving = Math.hypot(w.tx - w.x, w.ty - w.y) > 1.5;
        const bob = !still && (moving || st === "working") ? Math.abs(Math.sin(t * (st === "working" ? 12 : 8))) * 2 : 0;
        const px = 3, ox = w.x - 3.5 * px, oy = w.y - 9 * px - bob;
        ctx.fillStyle = "rgba(0,0,0,.4)"; ctx.beginPath(); ctx.ellipse(w.x, w.y + 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
        ASTRO.forEach((row, j) => { for (let i = 0; i < 7; i++) { const ch = row[w.face > 0 ? i : 6 - i]; if (ch === "0") continue; ctx.fillStyle = ch === "2" ? "#0b0e16" : a.color; ctx.fillRect(ox + i * px, oy + j * px, px, px); } });
        if (st === "working" && !still) { ctx.fillStyle = "#fff3c4"; for (let k = 0; k < 3; k++) { const aa = t * 9 + k * 2.1; ctx.fillRect(w.x + Math.cos(aa) * 14, w.y - 30 + Math.sin(aa) * 6, 2, 2); } }
        const selA = (sel?.kind === "agent" && sel.id === a.id) || hover.current === "agent:" + a.id;
        if (selA) { ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(w.x, w.y - 14, 20, 0, Math.PI * 2); ctx.stroke(); }
        ctx.font = "600 11px ui-monospace, Menlo, monospace"; ctx.fillStyle = st === "working" || st === "reviewing" ? "#ffb84d" : "rgba(226,230,237,.8)";
        ctx.fillText(a.name, w.x, w.y + 14);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    // input: drag to pan, wheel / pinch / buttons to zoom, tap to select
    const pts = new Map<number, { x: number; y: number }>();
    let dragged = false, pinch = 0;
    const toWorld = (sx: number, sy: number) => ({ x: cam.current.x + sx / cam.current.s, y: cam.current.y + sy / cam.current.s });
    const zoomAt = (sx: number, sy: number, f: number) => {
      const before = toWorld(sx, sy); const s = Math.max(0.25, Math.min(2.5, cam.current.s * f));
      cam.current = { x: before.x - sx / s, y: before.y - sy / s, s, fit: false };
    };
    const hit = (sx: number, sy: number): string | null => {
      const p = toWorld(sx, sy);
      for (const a of AGENTS) { const w = walkers[a.id]; if (Math.hypot(p.x - w.x, p.y - (w.y - 14)) < 22) return "agent:" + a.id; }
      for (const d of ROOMS) { const bs = brandsFor(d); for (let i = 0; i < bs.length; i++) { const q = podSpot(d, i, bs.length); if (Math.abs(p.x - q.x) < 32 && Math.abs(p.y - q.y) < 30) return "brand:" + bs[i].slug; } }
      for (const d of ROOMS) if (Math.hypot(p.x - d.x, p.y - d.y) < d.r) return "room:" + d.id;
      return null;
    };
    const local = (e: PointerEvent | WheelEvent) => { const r = c.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const down = (e: PointerEvent) => { c.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); dragged = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } };
    const move = (e: PointerEvent) => {
      const p = local(e);
      if (!pts.has(e.pointerId)) { const h = hit(p.x, p.y); hover.current = h; c.style.cursor = h ? "pointer" : "grab"; return; }
      const prev = pts.get(e.pointerId)!; pts.set(e.pointerId, p);
      if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch) zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / pinch); pinch = d; dragged = true; return; }
      const dx = p.x - prev.x, dy = p.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 1) dragged = true;
      cam.current = { ...cam.current, x: cam.current.x - dx / cam.current.s, y: cam.current.y - dy / cam.current.s, fit: false };
    };
    const up = (e: PointerEvent) => {
      const p = local(e); pts.delete(e.pointerId); if (pts.size < 2) pinch = 0;
      if (!dragged) {
        const h = hit(p.x, p.y);
        if (!h) setSel(null);
        else if (h.startsWith("agent:")) setSel({ kind: "agent", id: h.slice(6) });
        else if (h.startsWith("room:")) setSel({ kind: "room", id: h.slice(5) });
        else { const slug = h.slice(6); const room = ROOMS.find((r) => r.brands.includes(slug)); if (room) setSel({ kind: "room", id: room.id }); }
      }
    };
    const wheel = (e: WheelEvent) => { e.preventDefault(); const p = local(e); zoomAt(p.x, p.y, e.deltaY < 0 ? 1.12 : 1 / 1.12); };
    c.addEventListener("pointerdown", down); c.addEventListener("pointermove", move); c.addEventListener("pointerup", up); c.addEventListener("pointercancel", up); c.addEventListener("wheel", wheel, { passive: false });
    const onZoom = (e: Event) => { const f = (e as CustomEvent<number>).detail; if (f === 0) fit(); else zoomAt(wrap.clientWidth / 2, wrap.clientHeight / 2, f); };
    wrap.addEventListener("moonzoom", onZoom);
    return () => { cancelAnimationFrame(raf); c.removeEventListener("pointerdown", down); c.removeEventListener("pointermove", move); c.removeEventListener("pointerup", up); c.removeEventListener("pointercancel", up); c.removeEventListener("wheel", wheel); wrap.removeEventListener("moonzoom", onZoom); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoom = (f: number) => box.current?.dispatchEvent(new CustomEvent("moonzoom", { detail: f }));
  const room = sel?.kind === "room" ? ROOMS.find((r) => r.id === sel.id) : null;
  const agent = sel?.kind === "agent" ? AGENTS.find((a) => a.id === sel.id) : null;

  return (
    <div className="moon">
      <div className="moon-hud" role="status">
        <span><b>{BRANDS.length}</b> brands on the base</span>
        <span><b>{liveBrands}</b> live sites</span>
        <span><b>{building}</b> builds in progress</span>
        <span className={working ? "is-on" : ""}><b>{working}</b> of 7 builders working</span>
      </div>
      <div ref={box} className="moon-screen">
        <canvas ref={canvas} role="img" aria-label="Map of the Cyber Ad Space moon base. Domes hold brands; agents walk between them. Use the list below the map for the same information." />
        <div className="moon-zoom">
          <button type="button" onClick={() => zoom(1.25)} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => zoom(0.8)} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => zoom(0)} aria-label="Show the whole base">⤢</button>
        </div>
        {!sel && <p className="moon-tip">Drag to explore, pinch or use + to zoom. Tap a dome or an agent.</p>}
        {(room || agent) && (
          <aside className={`moon-panel${room ? " moon-terminal" : ""}`} aria-live="polite" style={room ? ({ "--t": room.color } as React.CSSProperties) : undefined}>
            <button type="button" className="moon-close" onClick={() => setSel(null)} aria-label="Close">×</button>
            {room && (() => {
              const bs = brandsFor(room), crew = AGENTS.filter((a) => a.room === room.id);
              const busy = crew.filter((a) => statuses[a.id] === "working" || statuses[a.id] === "reviewing").length;
              const orders = (feed?.orders ?? []).filter((o) => o.status !== "delivered");
              return (
                <>
                  <div className="term-head">
                    <div className="moon-kicker">{room.name} terminal</div>
                    <h2>{room.name}</h2>
                    <p>{room.blurb}</p>
                  </div>
                  <div className="term-stats">
                    {bs.length > 0 && <div><b>{bs.length}</b><small>Brands</small></div>}
                    {bs.length > 0 && <div><b>{bs.filter((b) => b.status.startsWith("Live")).length}</b><small>Live sites</small></div>}
                    <div><b>{crew.length}</b><small>Crew</small></div>
                    <div><b>{busy}</b><small>Working now</small></div>
                    {room.id === "factory" && <div><b>{orders.length}</b><small>Open orders</small></div>}
                  </div>
                  {bs.length > 0 && (
                    <section>
                      <h3 className="term-h">Brands in this dome</h3>
                      <div className="term-grid">
                        {bs.map((b) => (
                          <a key={b.slug} className="term-card" href={b.url} target="_blank" rel="noopener noreferrer" style={{ "--a": b.accent } as React.CSSProperties}>
                            <span className="term-logo">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={b.logo} alt="" loading="lazy" /></span>
                            <b>{b.name}</b>
                            <small>{b.tagline}</small>
                            <span className={`term-status${b.status.startsWith("Live") ? " is-live" : ""}`}>{b.status}</span>
                          </a>
                        ))}
                      </div>
                    </section>
                  )}
                  {room.id === "factory" && (
                    <section>
                      <h3 className="term-h">Open builds</h3>
                      {orders.length ? (
                        <ul className="term-builds">
                          {orders.map((o) => {
                            const keys = Object.keys(o.steps), done = keys.filter((k) => o.steps[k] === "done").length;
                            const now = AGENTS.find((a) => a.step && o.steps[a.step] === "running");
                            return (
                              <li key={o.code}>
                                <span className="mono">Brand #{o.code}</span>
                                <span className="term-bar"><i style={{ width: `${(done / keys.length) * 100}%` }} /></span>
                                <small>{now ? `${now.name} working` : o.status === "review" ? "With the reviewer" : `${done}/${keys.length} steps`}</small>
                              </li>
                            );
                          })}
                        </ul>
                      ) : <p className="term-empty">No open builds right now. New orders appear here the moment they&apos;re paid.</p>}
                    </section>
                  )}
                  <section>
                    <h3 className="term-h">Crew</h3>
                    <ul className="moon-list">
                      {crew.map((a) => (
                        <li key={a.id}><span className="moon-dot" style={{ background: a.color }} /><span className="moon-li-main"><b>{a.name}</b><small>{a.role}</small></span><span className={`moon-pill s-${statuses[a.id]}`}>{STATUS_TEXT[statuses[a.id]]}</span></li>
                      ))}
                      {!crew.length && <li><span /><span className="moon-li-main"><small>No agents stationed here. These brands run as live websites.</small></span><span /></li>}
                    </ul>
                  </section>
                  {room.id === "factory" && <a className="moon-cta" href="#factory-floor" onClick={() => setSel(null)}>Watch the factory floor ↓</a>}
                </>
              );
            })()}
            {agent && (
              <>
                <div className="moon-kicker" style={{ color: agent.color }}>{agent.kind === "person" ? "Person" : "Agent"} · {roomById(agent.room).name}</div>
                <h2>{agent.name}</h2>
                <p>{agent.role}.</p>
                <p><span className={`moon-pill s-${statuses[agent.id]}`}>{STATUS_TEXT[statuses[agent.id]]}</span></p>
                <p className="moon-note">{agent.note}</p>
                {agent.kind === "builder" && <a className="moon-cta" href="#factory-floor">See its work on the factory floor ↓</a>}
              </>
            )}
          </aside>
        )}
      </div>
      <details className="moon-text">
        <summary>Base directory (text version)</summary>
        {ROOMS.map((r) => (
          <p key={r.id}><b>{r.name}:</b> {[...brandsFor(r).map((b) => `${b.name} (${b.status})`), ...AGENTS.filter((a) => a.room === r.id).map((a) => `${a.name}, ${a.role.toLowerCase()} (${STATUS_TEXT[statuses[a.id]].toLowerCase()})`)].join("; ") || r.blurb}</p>
        ))}
      </details>
    </div>
  );
}
