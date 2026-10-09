"use client";

import { useEffect, useRef, useState } from "react";

type StepState = "pending" | "running" | "done" | "error";
type Agent = { key: string; label: string };
type ArcOrder = { code: string; label: string; status: string; steps: Record<string, StepState>; updatedAt: string };
type Feed = { now: string; live: boolean; agents: Agent[]; orders: ArcOrder[] };
type LogLine = { at: number; text: string };

const AGENT_NAMES: Record<string, string> = {
  brief: "Brief agent", names: "Naming agent", kit: "Brand kit agent", logo: "Logo agent",
  site: "Website agent", storefront: "Storefront agent", launch: "Launch agent",
};
const SHORT: Record<string, string> = { brief: "Brief", names: "Names", kit: "Kit", logo: "Logo", site: "Site", storefront: "Store", launch: "Launch" };
const FALLBACK_AGENTS: Agent[] = Object.keys(AGENT_NAMES).map((key) => ({ key, label: AGENT_NAMES[key] }));

// 11x8 invader, two frames; 13x7 ship.
const INVADER = [
  ["00100000100", "00010001000", "00111111100", "01101110110", "11111111111", "10111111101", "10100000101", "00011011000"],
  ["00100000100", "10010001001", "10111111101", "11101110111", "11111111111", "01111111110", "00100000100", "01000000010"],
];
const SHIP = ["0000001000000", "0000011100000", "0000011100000", "0111111111110", "1111111111111", "1111111111111", "1111111111111"];

const AMBER = "#ffb84d", CYAN = "#7fbfff", RED = "#ff5a4f", DIM = "rgba(174,181,198,.35)", INK = "#e2e6ed";

/** A scripted sample build used only when no real order is in progress. */
function replayOrder(tick: number, keys: string[]): ArcOrder {
  const phase = Math.floor(tick / 3) % (keys.length + 3);
  const steps = Object.fromEntries(keys.map((k, i) => [k, i < phase ? "done" : i === phase ? "running" : "pending"])) as Record<string, StepState>;
  return { code: "DEMO", label: "Sample build (replay)", status: "generating", steps, updatedAt: new Date().toISOString() };
}

export default function AgentArcade({ orderId, token }: { orderId?: string; token?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [replayTick, setReplayTick] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const prev = useRef<Record<string, StepState>>({});
  const state = useRef<{ orders: ArcOrder[]; agents: Agent[]; replay: boolean }>({ orders: [], agents: FALLBACK_AGENTS, replay: false });
  const booms = useRef<{ x: number; y: number; t: number }[]>([]);

  // Poll the real feed.
  useEffect(() => {
    let stop = false;
    const url = orderId ? `/api/arcade?order=${encodeURIComponent(orderId)}&t=${encodeURIComponent(token ?? "")}` : "/api/arcade";
    async function pull() {
      try { const r = await fetch(url, { cache: "no-store" }); if (r.ok && !stop) setFeed(await r.json()); } catch { /* keep last state */ }
    }
    pull();
    const id = setInterval(pull, orderId ? 3000 : 5000);
    return () => { stop = true; clearInterval(id); };
  }, [orderId, token]);

  const agents = feed?.agents?.length ? feed.agents : FALLBACK_AGENTS;
  const realOrders = feed?.orders ?? [];
  const replay = !orderId && !feed?.live;

  // Advance the replay clock only while in replay mode.
  useEffect(() => {
    if (!replay) return;
    const id = setInterval(() => setReplayTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [replay]);

  const orders = replay ? [replayOrder(replayTick, agents.map((a) => a.key)), ...realOrders.slice(0, 4)] : realOrders;

  // Turn step changes into log lines and explosions.
  useEffect(() => {
    const lines: LogLine[] = [];
    for (const o of orders) {
      for (const a of agents) {
        const k = `${o.code}:${a.key}`, s = o.steps[a.key], was = prev.current[k];
        if (was && was !== s) {
          const who = AGENT_NAMES[a.key] ?? a.label;
          if (s === "running") lines.push({ at: Date.now(), text: `${who} started on ${o.label}` });
          if (s === "done") { lines.push({ at: Date.now(), text: `${who} finished ${a.label.toLowerCase()} for ${o.label}` }); booms.current.push({ x: agents.indexOf(a), y: orders.indexOf(o), t: performance.now() }); }
          if (s === "error") lines.push({ at: Date.now(), text: `${who} hit a problem on ${o.label}. A person is on it.` });
        }
        prev.current[k] = s;
      }
    }
    if (lines.length) setLog((l) => [...lines.reverse(), ...l].slice(0, 8));
    state.current = { orders, agents, replay };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, replayTick]);

  // Draw loop.
  useEffect(() => {
    const c = canvas.current, box = wrap.current;
    if (!c || !box) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const px = (bits: string[], x: number, y: number, s: number, color: string) => {
      ctx.fillStyle = color;
      bits.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "1") ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), Math.ceil(s), Math.ceil(s)); });
    };
    const draw = (now: number) => {
      const { orders: os, agents: ag, replay: rp } = state.current;
      const dpr = window.devicePixelRatio || 1;
      const w = box.clientWidth, rows = Math.max(os.length, 1);
      const h = Math.max(300, 120 + rows * 54 + 90);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); c.style.height = `${h}px`; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const labelW = w < 520 ? 0 : 120;
      const colW = (w - labelW - 16) / ag.length;
      const s = Math.max(2, Math.min(4, colW / 18));
      const t = still ? 0 : now / 1000;
      const sway = still ? 0 : Math.sin(t * 1.2) * Math.min(10, colW * 0.12);
      const frame = still ? 0 : Math.floor(t * 2) % 2;
      const shipY = h - 70;

      ctx.font = "11px ui-monospace, Menlo, monospace";
      ctx.textBaseline = "middle";

      os.forEach((o, r) => {
        const y = 40 + r * 54;
        if (labelW) { ctx.fillStyle = o.code === "DEMO" ? DIM : INK; ctx.fillText(o.label.length > 16 ? o.label.slice(0, 15) + "…" : o.label, 8, y + 4 * s); }
        ag.forEach((a, i) => {
          const st = o.steps[a.key];
          const cx = labelW + 8 + (i + 0.5) * colW + sway;
          const x = cx - 5.5 * s;
          if (st === "done") { ctx.fillStyle = "rgba(127,191,255,.18)"; ctx.fillRect(cx - 2, y + 3 * s, 4, 4); return; }
          if (st === "error") { px(INVADER[0], x, y, s, RED); return; }
          if (st === "running") {
            const shake = still ? 0 : Math.sin(t * 40) * s * 0.6;
            px(INVADER[frame], x + shake, y, s, Math.floor(t * 8) % 2 ? "#ffffff" : AMBER);
            // laser from the agent's ship
            if (!still) {
              const top = y + 8 * s, bottom = shipY;
              for (let k = 0; k < 3; k++) {
                const p = ((t * 1.6 + k / 3) % 1);
                const by = bottom - p * (bottom - top);
                ctx.fillStyle = AMBER; ctx.fillRect(labelW + 8 + (i + 0.5) * colW - 1, by, 2, 10);
              }
            }
            return;
          }
          px(INVADER[frame], x, y, s, CYAN);
        });
      });

      // explosions
      booms.current = booms.current.filter((b) => now - b.t < 700);
      for (const b of booms.current) {
        const p = (now - b.t) / 700, cx = labelW + 8 + (b.x + 0.5) * colW + sway, cy = 40 + b.y * 54 + 4 * s;
        ctx.fillStyle = `rgba(255,184,77,${1 - p})`;
        for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.fillRect(cx + Math.cos(a) * p * 28, cy + Math.sin(a) * p * 28, s, s); }
      }

      // ground line and agent ships
      ctx.fillStyle = "rgba(255,255,255,.12)"; ctx.fillRect(labelW, shipY + 9 * s, w - labelW, 1);
      ag.forEach((a, i) => {
        const busy = os.some((o) => o.steps[a.key] === "running");
        const cx = labelW + 8 + (i + 0.5) * colW;
        const bob = busy && !still ? Math.sin(t * 6 + i) * 2 : 0;
        px(SHIP, cx - 6.5 * s, shipY + bob, s, busy ? AMBER : "rgba(226,230,237,.55)");
        ctx.fillStyle = busy ? AMBER : DIM;
        ctx.textAlign = "center";
        const long = (AGENT_NAMES[a.key] ?? a.label).replace(" agent", "");
        ctx.fillText(colW < 90 ? SHORT[a.key] ?? long : long, cx, shipY + 9 * s + 14);
        ctx.textAlign = "left";
      });

      if (rp) { ctx.fillStyle = DIM; ctx.textAlign = "right"; ctx.fillText("REPLAY · sample build", w - 8, 14); ctx.textAlign = "left"; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  const working = agents.filter((a) => orders.some((o) => o.steps[a.key] === "running"));

  return (
    <div className="arcade">
      <div className="arcade-bar">
        <span className={`arcade-dot ${replay ? "is-replay" : "is-live"}`} aria-hidden />
        <span>{orderId ? "Your build, live" : replay ? "No builds running right now. Showing a sample replay." : `Live: ${realOrders.length} build${realOrders.length === 1 ? "" : "s"} on the board`}</span>
        <span className="arcade-count">{working.length} of {agents.length} agents working</span>
      </div>
      <div ref={wrap} className="arcade-screen">
        <canvas ref={canvas} role="img" aria-label={`Agent arcade. ${working.length ? working.map((a) => AGENT_NAMES[a.key]).join(", ") + " working." : "All agents idle."}`} />
      </div>
      <div className="arcade-log" aria-live="polite">
        {log.length ? log.map((l) => <p key={l.at + l.text}><time>{new Date(l.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</time> {l.text}</p>)
          : <p className="muted">{replay ? "Agent activity will appear here as steps finish." : "Watching for the next step to finish…"}</p>}
      </div>
      <p className="arcade-legend"><span style={{ color: CYAN }}>■</span> waiting &nbsp; <span style={{ color: AMBER }}>■</span> being built &nbsp; <span style={{ color: RED }}>■</span> needs a person &nbsp; cleared = done. Every brand is reviewed by a person before delivery.</p>
    </div>
  );
}
