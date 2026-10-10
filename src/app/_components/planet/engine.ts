// Planet CAS 3D engine (three.js). Loaded only after the visitor presses Enter.
// It draws what the data model says and nothing else: agents only show work effects when their status is busy,
// and packets only fly when the page reports a real event from the order feed.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { DISTRICTS, STREET_ORDER, isBusy, type PlanetAgent, type PlanetEvent, type PlanetPod } from "./model";

export type EngineCallbacks = {
  onPickDistrict: (id: string) => void;
  onPickAgent: (id: string) => void;
  onRequestExit: () => void;
  onLocation: (label: string) => void;
};

export type PlanetEngine = {
  sync: (pods: PlanetPod[], agents: PlanetAgent[]) => void;
  enter: (district: string | null) => void;
  select: (agentId: string | null) => void;
  event: (e: PlanetEvent) => void;
  setJoystick: (x: number, y: number) => void;
  dispose: () => void;
};

// ---------------------------------------------------------------- layout
const GATE_X = 7.5; // lots start here on either side of Main Street
const LOT_U = 25; // lot depth away from the street
const LOT_V = 16; // half length along the street
const STREET = { half: 6.4, zMin: -177, zMax: 15 };
const FACTORY = new THREE.Vector3(0, 0, -192);
const PLAZA_R = 17.5;
const DECK = new THREE.Vector3(0, 5, -228);
const DECK_R = 10;
const EYE = 1.7;

type Lot = { id: string; side: number; zc: number; color: string; name: string };
const LOTS: Lot[] = STREET_ORDER.map((id, i) => {
  const d = DISTRICTS.find((x) => x.id === id)!;
  return { id, side: i % 2 === 0 ? -1 : 1, zc: -24 - i * 22, color: d.color, name: d.name };
});
const lotWorld = (l: Lot, u: number, v: number) => new THREE.Vector3(l.side * (GATE_X + u), 0, l.zc + v);
const yawFor = (dx: number, dz: number) => Math.atan2(dx, dz); // object rotation so +z faces (dx, dz)

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const M = (x: number, y: number, z: number, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")), new THREE.Vector3(sx, sy, sz));

// ---------------------------------------------------------------- textures
function canvas(w: number, h: number) { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")!] as const; }
function tex(c: HTMLCanvasElement, repeat?: [number, number]) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}

function noiseTexture(base: string, seed: number, size = 256, craters = 0) {
  const [c, g] = canvas(size, size);
  const r = seeded(seed);
  g.fillStyle = base; g.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 14; i++) {
    g.fillStyle = r() > 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(0,0,0,${0.05 + r() * 0.08})`;
    g.fillRect(r() * size, r() * size, 1 + r() * 2.5, 1 + r() * 2.5);
  }
  for (let i = 0; i < craters; i++) {
    const x = r() * size, y = r() * size, cr = 3 + r() * 14;
    g.fillStyle = "rgba(0,0,0,.18)"; g.beginPath(); g.arc(x, y, cr, 0, Math.PI * 2); g.fill();
    g.strokeStyle = "rgba(255,255,255,.10)"; g.lineWidth = 1.5; g.beginPath(); g.arc(x - 1, y - 1, cr, Math.PI * 0.9, Math.PI * 1.9); g.stroke();
  }
  return c;
}

function plankTexture(base: string, seed: number) {
  const [c, g] = canvas(128, 128);
  const r = seeded(seed);
  for (let y = 0; y < 128; y += 16) {
    const l = 0.85 + r() * 0.3;
    g.fillStyle = base; g.globalAlpha = 1; g.fillRect(0, y, 128, 16);
    g.fillStyle = `rgba(${l > 1 ? "255,255,255" : "0,0,0"},${Math.abs(l - 1) * 0.6})`; g.fillRect(0, y, 128, 16);
    g.fillStyle = "rgba(0,0,0,.45)"; g.fillRect(0, y + 15, 128, 1);
    for (let k = 0; k < 6; k++) { g.fillStyle = "rgba(0,0,0,.12)"; g.fillRect(0, y + 2 + r() * 12, 128, 1); }
    g.fillStyle = "rgba(0,0,0,.5)"; g.fillRect(Math.floor(r() * 128), y, 1, 15);
  }
  return c;
}

function blockTexture(base: string, seed: number) {
  const [c, g] = canvas(128, 128);
  const r = seeded(seed);
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 32) for (let x = (y / 32) % 2 ? -32 : 0; x < 128; x += 64) {
    g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "0,0,0"},${r() * 0.08})`; g.fillRect(x + 1, y + 1, 62, 30);
    g.strokeStyle = "rgba(0,0,0,.35)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, 62, 30);
  }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(0,0,0,${r() * 0.12})`; g.fillRect(r() * 128, r() * 128, 1, 1); }
  return c;
}

function fitFont(g: CanvasRenderingContext2D, text: string, weight: string, size: number, family: string, maxW: number) {
  let s = size;
  do { g.font = `${weight} ${s}px ${family}`; s -= 2; } while (g.measureText(text).width > maxW && s > 10);
}

function textTexture(text: string, o: { w: number; h: number; color: string; bg?: string; border?: string; family?: string; weight?: string; size?: number; spacing?: number; glow?: boolean }) {
  const [c, g] = canvas(o.w, o.h);
  if (o.bg) { g.fillStyle = o.bg; g.fillRect(0, 0, o.w, o.h); }
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 6; g.strokeRect(3, 3, o.w - 6, o.h - 6); }
  const fam = o.family ?? "'Space Grotesk', system-ui, sans-serif";
  if (o.spacing) (g as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${o.spacing}px`;
  fitFont(g, text, o.weight ?? "700", o.size ?? Math.round(o.h * 0.56), fam, o.w * 0.9);
  g.textAlign = "center"; g.textBaseline = "middle";
  if (o.glow) { g.shadowColor = o.color; g.shadowBlur = 18; }
  g.fillStyle = o.color; g.fillText(text, o.w / 2, o.h / 2 + 2);
  return tex(c);
}

/** A tag above an agent's head: a name, or a status shown only while the agent is busy. */
function tagTexture(text: string, color: string, dot = false) {
  const [c, g] = canvas(256, 64);
  g.fillStyle = "rgba(6,9,16,.82)";
  g.beginPath(); g.roundRect(4, 8, 248, 48, 24); g.fill();
  g.strokeStyle = color; g.lineWidth = 3; g.stroke();
  fitFont(g, text, "600", 26, "ui-monospace, Menlo, monospace", dot ? 190 : 220);
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = color;
  if (dot) { g.beginPath(); g.arc(30, 32, 7, 0, Math.PI * 2); g.fill(); g.fillText(text, 140, 33); }
  else g.fillText(text, 128, 33);
  return tex(c);
}

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();
function loadImage(url: string) {
  if (!imageCache.has(url)) imageCache.set(url, new Promise((res) => {
    const img = new Image();
    if (/^https?:/.test(url)) img.crossOrigin = "anonymous";
    img.onload = () => res(img); img.onerror = () => res(null);
    img.decoding = "async"; img.src = url;
  }));
  return imageCache.get(url)!;
}

/** Logo drawn onto a small canvas (never the full-size image) for a building sign or a chest badge. */
function logoTexture(logo: string | null, letters: string, accent: string, kind: "sign" | "badge") {
  const size = kind === "sign" ? 256 : 128;
  const [c, g] = canvas(size, size);
  const t = tex(c);
  const paint = (img: HTMLImageElement | null) => {
    g.clearRect(0, 0, size, size);
    g.fillStyle = "#0b0f1a"; g.strokeStyle = accent; g.lineWidth = size * 0.045;
    g.beginPath();
    if (kind === "sign") g.roundRect(size * 0.04, size * 0.04, size * 0.92, size * 0.92, size * 0.1); else g.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
    g.fill(); g.stroke();
    const box = size * (kind === "sign" ? 0.74 : 0.66);
    if (img && img.width) {
      const k = Math.min(box / img.width, box / img.height);
      const w = img.width * k, h = img.height * k;
      try { g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h); } catch { /* tainted: keep letters */ }
    } else {
      g.fillStyle = accent; g.textAlign = "center"; g.textBaseline = "middle";
      g.font = `700 ${Math.round(size * 0.36)}px 'Space Grotesk', system-ui, sans-serif`;
      g.fillText(letters, size / 2, size / 2 + 2);
    }
    t.needsUpdate = true;
  };
  paint(null);
  if (logo) loadImage(logo).then((img) => { if (img) paint(img); });
  return t;
}

// ---------------------------------------------------------------- static geometry batching
class Batch {
  private buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geo: THREE.BufferGeometry, mat: THREE.Material, m: THREE.Matrix4) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== "position" && k !== "normal" && k !== "uv") g.deleteAttribute(k);
    g.clearGroups();
    const list = this.buckets.get(mat) ?? [];
    list.push(g); this.buckets.set(mat, list);
  }
  build(into: THREE.Object3D) {
    for (const [mat, list] of this.buckets) {
      const merged = mergeGeometries(list, false);
      list.forEach((g) => g.dispose());
      if (!merged) continue;
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.matrixAutoUpdate = false;
      into.add(mesh);
    }
    this.buckets.clear();
  }
}

// shared unit geometries
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  cyl12: new THREE.CylinderGeometry(1, 1, 1, 12),
  plane: new THREE.PlaneGeometry(1, 1),
  arch: new THREE.TorusGeometry(1, 0.07, 6, 16, Math.PI),
  ring: new THREE.TorusGeometry(1, 0.05, 4, 24),
  bigRing: new THREE.TorusGeometry(1, 0.008, 3, 64),
};

// ---------------------------------------------------------------- the engine
export function createPlanet(container: HTMLElement, cb: EngineCallbacks, opts: { reduced: boolean; coarse: boolean }): PlanetEngine {
  const reduced = opts.reduced;
  const renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = "planet-canvas";
  renderer.domElement.setAttribute("aria-hidden", "true");
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#03040a");
  scene.fog = new THREE.Fog("#0a0b12", 70, 430);
  const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 2000);
  camera.rotation.order = "YXZ";

  // lights: low warm sun at dusk, cool sky fill
  scene.add(new THREE.HemisphereLight("#7484ad", "#3a332c", 1.7));
  const sun = new THREE.DirectionalLight("#ffbf8a", 2.2);
  sun.position.set(120, 38, -70);
  scene.add(sun);

  // materials
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(x: T) => { disposables.push(x); return x; };
  const lam = (o: THREE.MeshLambertMaterialParameters) => keep(new THREE.MeshLambertMaterial(o));
  const regolithTex = keep(tex(noiseTexture("#5d5f66", 3, 256, 26), [140, 140]));
  const roadTex = keep(tex(noiseTexture("#47464a", 5, 256, 0), [2, 40]));
  const woodTex = keep(tex(plankTexture("#7a5434", 9)));
  const adobeTex = keep(tex(blockTexture("#b48d66", 11)));
  const stoneTex = keep(tex(blockTexture("#a89f8c", 13)));
  const pavedTex = keep(tex(blockTexture("#4c4a47", 17), [6, 8]));
  const mat = {
    ground: lam({ map: regolithTex }),
    road: lam({ map: roadTex }),
    wood: lam({ map: woodTex }),
    adobe: lam({ map: adobeTex }),
    woodDark: lam({ color: "#3f2b1c" }),
    stone: lam({ map: stoneTex }),
    stoneDark: lam({ color: "#6f685b" }),
    paved: lam({ map: pavedTex }),
    metal: lam({ color: "#5b6270" }),
    rock: lam({ color: "#3b3c42", flatShading: true }),
    door: lam({ color: "#17110c" }),
    window: keep(new THREE.MeshBasicMaterial({ color: "#7a5a32" })),
    lamp: keep(new THREE.MeshBasicMaterial({ color: "#ffd9a0", toneMapped: false })),
    glass: keep(new THREE.MeshLambertMaterial({ color: "#9fd0ff", transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })),
  };
  const neonCache = new Map<string, THREE.MeshBasicMaterial>();
  const neon = (color: string) => {
    if (!neonCache.has(color)) neonCache.set(color, keep(new THREE.MeshBasicMaterial({ color, toneMapped: false })));
    return neonCache.get(color)!;
  };
  const signMat = (t: THREE.Texture, additive = false) => keep(new THREE.MeshBasicMaterial({ map: keep(t), transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: !additive, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending }));

  const world = new THREE.Group(); scene.add(world);
  const proxies = new THREE.Group(); // invisible click targets, never rendered
  const proxyMat = keep(new THREE.MeshBasicMaterial());
  const addProxy = (m: THREE.Matrix4, district: string) => { const p = new THREE.Mesh(G.box, proxyMat); p.matrixAutoUpdate = false; p.matrix.copy(m); p.userData.district = district; proxies.add(p); return p; };
  const holograms: THREE.Mesh[] = [];

  // ---------------------------------------------------------------- sky
  const sky = new THREE.Group(); scene.add(sky);
  {
    const r = seeded(21), n = 1600, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1, th = r() * Math.PI * 2, y = Math.abs(u) * 0.98 + 0.02, rr = Math.sqrt(1 - y * y);
      pos.set([Math.cos(th) * rr * 900, y * 900 - 30, Math.sin(th) * rr * 900], i * 3);
      const b = 0.55 + r() * 0.45, warm = r();
      col.set([b, b * (0.92 + warm * 0.08), b * (warm > 0.8 ? 0.8 : 1)], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const stars = new THREE.Points(keep(g), keep(new THREE.PointsMaterial({ size: 1.6, sizeAttenuation: false, vertexColors: true, fog: false, depthWrite: false })));
    sky.add(stars);

    // Earth: original procedural texture
    const [c, eg] = canvas(512, 256);
    const er = seeded(77);
    const oce = eg.createLinearGradient(0, 0, 0, 256); oce.addColorStop(0, "#1d4f86"); oce.addColorStop(0.5, "#2a6db2"); oce.addColorStop(1, "#1d4f86");
    eg.fillStyle = oce; eg.fillRect(0, 0, 512, 256);
    for (let k = 0; k < 9; k++) {
      const cx = er() * 512, cy = 50 + er() * 156, sz = 18 + er() * 42;
      for (let j = 0; j < 26; j++) {
        eg.fillStyle = er() > 0.35 ? "#4f7d3c" : "#8a7a4a";
        eg.beginPath(); eg.ellipse(cx + (er() - 0.5) * sz * 2.2, cy + (er() - 0.5) * sz, sz * (0.3 + er() * 0.5), sz * (0.2 + er() * 0.4), er() * 3, 0, Math.PI * 2); eg.fill();
      }
    }
    eg.fillStyle = "#eef3f8"; eg.fillRect(0, 0, 512, 14); eg.fillRect(0, 242, 512, 14);
    for (let k = 0; k < 60; k++) { eg.fillStyle = `rgba(255,255,255,${0.25 + er() * 0.4})`; eg.beginPath(); eg.ellipse(er() * 512, er() * 256, 10 + er() * 40, 2 + er() * 5, er() * 0.4 - 0.2, 0, Math.PI * 2); eg.fill(); }
    const earth = new THREE.Mesh(keep(new THREE.SphereGeometry(46, 32, 20)), keep(new THREE.MeshLambertMaterial({ map: keep(tex(c)), fog: false })));
    earth.position.set(-170, 175, -520); earth.rotation.set(0.3, 1.2, 0.2);
    sky.add(earth);
    const [hc, hg] = canvas(128, 128);
    const halo = hg.createRadialGradient(64, 64, 36, 64, 64, 64); halo.addColorStop(0, "rgba(120,180,255,.55)"); halo.addColorStop(1, "rgba(120,180,255,0)");
    hg.fillStyle = halo; hg.fillRect(0, 0, 128, 128);
    const glow = new THREE.Sprite(keep(new THREE.SpriteMaterial({ map: keep(tex(hc)), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true })));
    glow.scale.set(130, 130, 1); glow.position.copy(earth.position);
    sky.add(glow);

    // dusk glow on the horizon
    const [gc, gg] = canvas(4, 128);
    const band = gg.createLinearGradient(0, 0, 0, 128); band.addColorStop(0, "rgba(0,0,0,0)"); band.addColorStop(0.7, "rgba(120,60,40,.25)"); band.addColorStop(1, "rgba(255,140,70,.55)");
    gg.fillStyle = band; gg.fillRect(0, 0, 4, 128);
    const horizon = new THREE.Mesh(keep(new THREE.CylinderGeometry(800, 800, 140, 32, 1, true)), keep(new THREE.MeshBasicMaterial({ map: keep(tex(gc)), transparent: true, side: THREE.BackSide, depthWrite: false, fog: false, blending: THREE.AdditiveBlending })));
    horizon.position.y = 40;
    sky.add(horizon);
  }

  // ---------------------------------------------------------------- terrain and static scenery
  const B = new Batch();
  {
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(1400, 1400)), mat.ground);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -0.01, -100);
    world.add(ground);

    // distant hills
    const hills = new THREE.CylinderGeometry(420, 450, 60, 72, 1, true);
    const hp = hills.attributes.position as THREE.BufferAttribute;
    const hr = seeded(31);
    for (let i = 0; i < hp.count; i++) if (hp.getY(i) > 0) hp.setY(i, -10 + hr() * 50 + Math.sin(i * 0.7) * 10); else hp.setY(i, -30);
    hills.computeVertexNormals();
    const hillMesh = new THREE.Mesh(keep(hills), keep(new THREE.MeshLambertMaterial({ color: "#2b2c31", side: THREE.BackSide, flatShading: true })));
    hillMesh.position.set(0, 0, -100);
    world.add(hillMesh);

    // craters and rocks, kept off the street, lots and plaza
    const cr = seeded(41);
    const clear = (x: number, z: number, pad: number) =>
      (Math.abs(x) < GATE_X + LOT_U + 3 + pad && z > -175 - pad && z < 22 + pad) ||
      Math.hypot(x - FACTORY.x, z - FACTORY.z) < PLAZA_R + 8 + pad || Math.hypot(x - DECK.x, z - DECK.z) < 22 + pad;
    for (let i = 0; i < 70; i++) {
      const x = (cr() - 0.5) * 260, z = 40 - cr() * 330, rad = 2 + Math.pow(cr(), 2) * 12;
      if (clear(x, z, rad)) continue;
      B.add(G.ring, mat.stoneDark, M(x, 0.05, z, 0, rad, rad, rad * 2.2, Math.PI / 2));
    }
    for (let i = 0; i < 90; i++) {
      const x = (cr() - 0.5) * 240, z = 30 - cr() * 320, s = 0.3 + cr() * 1.4;
      if (clear(x, z, 1)) continue;
      B.add(G.cyl6, mat.rock, M(x, s * 0.3, z, cr() * 3, s, s * 0.7, s * 0.8, cr() * 0.4, cr() * 0.4));
    }

    // Main Street: road, boardwalks, lamps, barrels
    const road = new THREE.Mesh(keep(new THREE.PlaneGeometry(10, STREET.zMax - STREET.zMin + 6)), mat.road);
    road.rotation.x = -Math.PI / 2; road.position.set(0, 0.005, (STREET.zMax + STREET.zMin) / 2);
    world.add(road);
    for (const s of [-1, 1]) {
      for (let z = 10; z > STREET.zMin + 4; z -= 4) B.add(G.box, mat.wood, M(s * 5.8, 0.1, z - 2, 0, 1.6, 0.2, 4));
      for (let z = 6; z > STREET.zMin + 4; z -= 14) {
        const x = s * 6.9;
        B.add(G.cyl8, mat.metal, M(x, 2.1, z, 0, 0.09, 4.2, 0.09));
        B.add(G.box, mat.metal, M(x - s * 0.5, 4.15, z, 0, 1.1, 0.08, 0.08));
        B.add(G.box, mat.lamp, M(x - s * 0.95, 3.9, z, 0, 0.28, 0.4, 0.28));
      }
    }
    const br = seeded(51);
    for (let i = 0; i < 18; i++) {
      const s = br() > 0.5 ? 1 : -1, z = 8 - br() * 175;
      if (LOTS.some((l) => l.side === s && Math.abs(z - l.zc) < 5)) continue;
      B.add(G.cyl8, mat.woodDark, M(s * (6.4 + br() * 0.3), 0.55, z, 0, 0.38, 0.9, 0.38));
    }

    // landing pad and welcome arch
    B.add(G.cyl12, mat.metal, M(0, 0.06, 13, 0, 4.2, 0.12, 4.2));
    B.add(G.bigRing, neon("#55d6ff"), M(0, 0.14, 13, 0, 3.9, 3.9, 3.9, Math.PI / 2));
    for (const s of [-1, 1]) {
      B.add(G.cyl8, mat.wood, M(s * 7.3, 3.6, 4, 0, 0.35, 7.2, 0.35));
      B.add(G.box, mat.stone, M(s * 7.3, 0.4, 4, 0, 1.2, 0.8, 1.2));
    }
    B.add(G.box, mat.woodDark, M(0, 7.1, 4, 0, 15.4, 0.5, 0.5));
    B.add(G.box, neon("#ffb84d"), M(0, 7.4, 4.26, 0, 15, 0.07, 0.07));
    const welcome = new THREE.Mesh(G.plane, signMat(textTexture("PLANET CAS · MAIN STREET", { w: 1024, h: 128, color: "#ffb84d", bg: "#2a1c12", border: "#ffb84d", family: "Georgia, 'Times New Roman', serif", weight: "700", spacing: 6 })));
    welcome.scale.set(9, 1.15, 1); welcome.position.set(0, 6.1, 4.05); welcome.rotation.y = 0;
    world.add(welcome);
    const welcomeBack = welcome.clone(); welcomeBack.position.z = 3.95; welcomeBack.rotation.y = Math.PI; world.add(welcomeBack);
    const casHolo = new THREE.Mesh(G.plane, signMat(logoTexture("/assets/logos/logo-cyberadspace.png", "CAS", "#ffb84d", "sign"), true));
    casHolo.scale.set(2.6, 2.6, 1); casHolo.position.set(0, 9.2, 4); world.add(casHolo); holograms.push(casHolo);

    // districts: walls, gate archway, paved yard
    for (const l of LOTS) {
      const s = l.side, color = l.color;
      const yard = lotWorld(l, LOT_U / 2, 0);
      B.add(G.box, mat.paved, M(yard.x, 0.02, yard.z, 0, LOT_U, 0.04, LOT_V * 2));
      const wall = (u0: number, u1: number, v0: number, v1: number) => {
        const a = lotWorld(l, (u0 + u1) / 2, (v0 + v1) / 2), w = Math.abs(u1 - u0) || 0.5, d = Math.abs(v1 - v0) || 0.5;
        B.add(G.box, mat.stone, M(a.x, 0.65, a.z, 0, w, 1.3, d));
        B.add(G.box, mat.stoneDark, M(a.x, 1.36, a.z, 0, w + 0.12, 0.14, d + 0.12));
      };
      wall(0, 0, -LOT_V, -3.8); wall(0, 0, 3.8, LOT_V); wall(LOT_U, LOT_U, -LOT_V, LOT_V);
      wall(0, LOT_U, -LOT_V, -LOT_V); wall(0, LOT_U, LOT_V, LOT_V);
      for (const v of [-1, 1]) {
        const a = lotWorld(l, 0, v * 9.9);
        B.add(G.box, neon(color), M(a.x - s * 0.3, 1.46, a.z, 0, 0.06, 0.06, 12.2));
      }
      // gate: local +z faces the street
      const gm = M(s * GATE_X, 0, l.zc, yawFor(-s, 0));
      const part = (geo: THREE.BufferGeometry, m: THREE.Material, local: THREE.Matrix4) => B.add(geo, m, gm.clone().multiply(local));
      for (const x of [-3.5, 3.5]) {
        part(G.box, mat.stone, M(x, 0.3, 0, 0, 1.4, 0.6, 1.4));
        part(G.cyl8, mat.stone, M(x, 3.0, 0, 0, 0.45, 5, 0.45));
        part(G.box, mat.stone, M(x, 5.6, 0, 0, 1.25, 0.4, 1.25));
      }
      part(G.box, mat.stone, M(0, 6.2, 0, 0, 8.6, 0.9, 1.1));
      part(G.box, mat.stoneDark, M(0, 6.85, 0, 0, 5.2, 0.4, 0.9));
      part(G.arch, mat.stone, M(0, 1.9, 0, 0, 3.05, 3.05, 6));
      part(G.box, neon(color), M(0, 6.68, 0.58, 0, 8.6, 0.07, 0.07));
      part(G.box, neon(color), M(0, 5.72, 0.58, 0, 8.6, 0.07, 0.07));
      const signM = gm.clone().multiply(M(0, 6.2, 0.57, 0));
      const sign = new THREE.Mesh(G.plane, signMat(textTexture(l.name.toUpperCase(), { w: 768, h: 96, color: "#2a1d10", bg: "#c9b48e", family: "Georgia, 'Times New Roman', serif", weight: "700", spacing: 8 })));
      sign.matrixAutoUpdate = false; sign.matrix.copy(signM.multiply(M(0, 0, 0, 0, 7.6, 0.8, 1)));
      world.add(sign);
      const holo = new THREE.Mesh(G.plane, signMat(textTexture(l.name, { w: 512, h: 96, color, family: "'Space Grotesk', system-ui, sans-serif", weight: "600", glow: true }), true));
      holo.matrixAutoUpdate = false; holo.matrix.copy(gm.clone().multiply(M(0, 8.1, 0, 0, 5.4, 1.0, 1)));
      world.add(holo); holograms.push(holo);
      addProxy(gm.clone().multiply(M(0, 3.6, 0, 0, 9, 7.4, 2.4)), l.id);
    }

    // Brand Factory plaza
    B.add(G.cyl12, mat.paved, M(FACTORY.x, 0.03, FACTORY.z, 0, PLAZA_R + 1, 0.06, PLAZA_R + 1));
    B.add(G.bigRing, neon("#ffb84d"), M(FACTORY.x, 0.1, FACTORY.z, 0, PLAZA_R + 0.6, PLAZA_R + 0.6, PLAZA_R + 0.6, Math.PI / 2));
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      if (Math.sin(a) > 0.82) continue; // leave the street entrance open
      const x = FACTORY.x + Math.cos(a) * (PLAZA_R + 1.2), z = FACTORY.z + Math.sin(a) * (PLAZA_R + 1.2);
      B.add(G.box, mat.stone, M(x, 0.3, z, -a, 1.2, 0.6, 1.2));
      B.add(G.cyl8, mat.stone, M(x, 3.2, z, -a, 0.42, 5.4, 0.42));
      B.add(G.box, mat.stone, M(x, 6.05, z, -a, 1.15, 0.35, 1.15));
      B.add(G.box, neon("#ffb84d"), M(x, 6.3, z, -a, 0.7, 0.07, 0.7));
    }
    // factory gate at the end of the street
    const fg = M(0, 0, -175.2, 0);
    for (const x of [-4.5, 4.5]) { B.add(G.box, mat.stone, fg.clone().multiply(M(x, 3.6, 0, 0, 1.4, 7.2, 1.4))); B.add(G.box, neon("#ffb84d"), fg.clone().multiply(M(x, 3.6, 0.72, 0, 0.07, 7.2, 0.07))); }
    B.add(G.box, mat.stone, fg.clone().multiply(M(0, 7.6, 0, 0, 10.8, 1.1, 1.3)));
    B.add(G.arch, mat.stone, fg.clone().multiply(M(0, 2.4, 0, 0, 3.8, 3.8, 7)));
    const fsign = new THREE.Mesh(G.plane, signMat(textTexture("BRAND FACTORY", { w: 768, h: 96, color: "#2a1d10", bg: "#c9b48e", family: "Georgia, 'Times New Roman', serif", weight: "700", spacing: 10 })));
    fsign.position.set(0, 7.6, -175.2 + 0.66); fsign.scale.set(9, 0.95, 1); world.add(fsign);
    addProxy(fg.clone().multiply(M(0, 4, 0, 0, 11, 8, 2)), "factory");
    // center pedestal and CAS hologram
    B.add(G.cyl12, mat.stone, M(FACTORY.x, 0.5, FACTORY.z, 0, 2.2, 1, 2.2));
    B.add(G.ring, neon("#ffb84d"), M(FACTORY.x, 1.02, FACTORY.z, 0, 2, 2, 2, Math.PI / 2));
    const fh = new THREE.Mesh(G.plane, signMat(logoTexture("/assets/logos/logo-cyberadspace.png", "CAS", "#ffb84d", "sign"), true));
    fh.scale.set(3.2, 3.2, 1); fh.position.set(FACTORY.x, 3.4, FACTORY.z); world.add(fh); holograms.push(fh);
    addProxy(M(FACTORY.x, 2, FACTORY.z, 0, 4.5, 4, 4.5), "factory");
    // two frontier water towers (decor only, nothing moves)
    for (const s of [-1, 1]) {
      const x = s * 15, z = FACTORY.z - 12;
      for (const dx of [-1, 1]) for (const dz of [-1, 1]) B.add(G.box, mat.woodDark, M(x + dx * 1.2, 3.5, z + dz * 1.2, 0, 0.25, 7, 0.25));
      B.add(G.cyl12, mat.wood, M(x, 8.4, z, 0, 2.1, 3, 2.1));
      B.add(G.cyl12, mat.woodDark, M(x, 10.1, z, 0, 2.3, 0.4, 2.3));
      B.add(G.ring, neon(s < 0 ? "#55d6ff" : "#ffb84d"), M(x, 7.2, z, 0, 2.15, 2.15, 2.15, Math.PI / 2));
    }

    // Command Dome on its mesa, overlooking the plaza
    B.add(new THREE.CylinderGeometry(13.5, 15.5, DECK.y, 10), mat.rock, M(DECK.x, DECK.y / 2, DECK.z));
    B.add(G.cyl12, mat.paved, M(DECK.x, DECK.y + 0.03, DECK.z, 0, 13.2, 0.06, 13.2));
    for (let k = 0; k < 10; k++) B.add(G.box, mat.stone, M(0, (k + 0.5) * (DECK.y / 10), DECK.z + 15.8 - k * 0.55, 0, 4, DECK.y / 10, 0.6));
    const dome = new THREE.Mesh(keep(new THREE.SphereGeometry(DECK_R + 1.2, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2)), mat.glass);
    dome.position.copy(DECK); world.add(dome);
    const ribs = new THREE.LineSegments(keep(new THREE.WireframeGeometry(new THREE.SphereGeometry(DECK_R + 1.25, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2))), keep(new THREE.LineBasicMaterial({ color: "#ffb84d", transparent: true, opacity: 0.35 })));
    ribs.position.copy(DECK); world.add(ribs);
    B.add(G.bigRing, neon("#ffb84d"), M(DECK.x, DECK.y + 0.12, DECK.z, 0, DECK_R + 1.2, DECK_R + 1.2, DECK_R + 1.2, Math.PI / 2));
    const dh = new THREE.Mesh(G.plane, signMat(textTexture("COMMAND DOME", { w: 512, h: 96, color: "#ffb84d", glow: true }), true));
    dh.scale.set(6, 1.1, 1); dh.position.set(DECK.x, DECK.y + DECK_R + 3.2, DECK.z + 2); world.add(dh); holograms.push(dh);
    addProxy(M(DECK.x, DECK.y / 2 + 4, DECK.z, 0, 26, DECK.y + 10, 26), "deck");
  }
  B.build(world);

  // ---------------------------------------------------------------- brand buildings (rebuilt when the pod list changes)
  type Frame = { m: THREE.Matrix4; rot: number; s: number; center: THREE.Vector3; ground: number; district: string };
  const podFrames = new Map<string, Frame>();
  let podGroup = new THREE.Group(); world.add(podGroup);
  let podKey = "";
  let podProxies: THREE.Mesh[] = [];
  const podDisposables: { dispose: () => void }[] = [];

  function slots(n: number): { u: number; v: number; dir: [number, number]; s: number }[] {
    // dir is in lot coordinates: [du, dv]; [-1, 0] faces the street
    if (n <= 4) return Array.from({ length: n }, (_, i) => ({ u: 19.6, v: (i - (n - 1) / 2) * 6.6, dir: [-1, 0] as [number, number], s: 1 }));
    if (n <= 8) {
      const out = Array.from({ length: 4 }, (_, i) => ({ u: 19.6, v: (i - 1.5) * 6.6, dir: [-1, 0] as [number, number], s: 1 }));
      const sides = [{ u: 11.5, v: -12.4, dir: [0, 1] as [number, number] }, { u: 11.5, v: 12.4, dir: [0, -1] as [number, number] }, { u: 4.6, v: -12.4, dir: [0, 1] as [number, number] }, { u: 4.6, v: 12.4, dir: [0, -1] as [number, number] }];
      return [...out, ...sides.slice(0, n - 4).map((x) => ({ ...x, s: 1 }))];
    }
    const cols = Math.ceil(Math.sqrt(n * 1.3)), rows = Math.ceil(n / cols), s = Math.min(0.62, 26 / (cols * 6.6));
    return Array.from({ length: n }, (_, i) => ({ u: 22 - Math.floor(i / cols) * (17 / Math.max(1, rows)), v: ((i % cols) - (cols - 1) / 2) * (30 / cols), dir: [-1, 0] as [number, number], s }));
  }

  function buildPods(pods: PlanetPod[]) {
    podGroup.removeFromParent();
    podGroup.traverse((o) => { const g = (o as THREE.Mesh).geometry; if (g && !Object.values(G).includes(g as never)) g.dispose(); });
    podDisposables.splice(0).forEach((d) => d.dispose());
    podProxies.forEach((p) => proxies.remove(p)); podProxies = [];
    podFrames.clear();
    podGroup = new THREE.Group(); world.add(podGroup);
    const pb = new Batch();
    const own = <T extends { dispose: () => void }>(x: T) => { podDisposables.push(x); return x; };
    const byDistrict = new Map<string, PlanetPod[]>();
    for (const p of pods) byDistrict.set(p.district, [...(byDistrict.get(p.district) ?? []), p]);
    for (const [district, list] of byDistrict) {
      const lot = LOTS.find((l) => l.id === district);
      let frames: { pos: THREE.Vector3; rot: number; s: number; ground: number }[];
      if (lot) {
        frames = slots(list.length).map((sl) => {
          const pos = lotWorld(lot, sl.u, sl.v);
          return { pos, rot: yawFor(lot.side * sl.dir[0], sl.dir[1]), s: sl.s, ground: 0 };
        });
      } else if (district === "deck") {
        frames = list.map((_, i) => {
          const a = Math.PI * (0.15 + (0.7 * (i + 0.5)) / list.length) + Math.PI; // back half of the dome
          const pos = new THREE.Vector3(DECK.x + Math.cos(a) * 7.6, DECK.y, DECK.z + Math.sin(a) * 5.8);
          return { pos, rot: yawFor(DECK.x - pos.x, DECK.z + 3 - pos.z), s: 0.5, ground: DECK.y };
        });
      } else {
        // factory never holds brand buildings; anything else lands around the plaza edge
        frames = list.map((_, i) => {
          const a = -Math.PI / 2 + (i - (list.length - 1) / 2) * 0.3;
          const pos = new THREE.Vector3(FACTORY.x + Math.cos(a) * 15, 0, FACTORY.z + Math.sin(a) * 15);
          return { pos, rot: yawFor(FACTORY.x - pos.x, FACTORY.z - pos.z), s: 0.55, ground: 0 };
        });
      }
      list.forEach((p, i) => {
        const f = frames[i]!;
        const m = M(f.pos.x, f.ground, f.pos.z, f.rot, f.s, f.s, f.s);
        podFrames.set(p.slug, { m, rot: f.rot, s: f.s, center: f.pos.clone().setY(f.ground), ground: f.ground, district });
        const body = i % 2 ? mat.adobe : mat.wood;
        const add = (geo: THREE.BufferGeometry, mm: THREE.Material, local: THREE.Matrix4) => pb.add(geo, mm, m.clone().multiply(local));
        add(G.box, body, M(0, 1.8, 0, 0, 5.2, 3.6, 5));
        add(G.box, body, M(0, 2.85, 2.6, 0, 5.6, 5.7, 0.3));
        add(G.box, body, M(0, 6.0, 2.6, 0, 3.0, 0.7, 0.3));
        add(G.box, mat.woodDark, M(0, 5.72, 2.65, 0, 5.9, 0.22, 0.5));
        add(G.box, neon(p.accent), M(0, 5.86, 2.8, 0, 5.6, 0.07, 0.07));
        add(G.box, neon(p.accent), M(0, 6.38, 2.8, 0, 3.0, 0.07, 0.07));
        for (const x of [-2.8, 2.8]) add(G.box, neon(p.accent), M(x, 2.95, 2.8, 0, 0.07, 5.6, 0.07));
        add(G.box, mat.woodDark, M(0, 3.1, 3.5, 0, 5.8, 0.12, 1.7));
        for (const x of [-2.7, 2.7]) add(G.cyl6, mat.woodDark, M(x, 1.55, 4.2, 0, 0.09, 3.1, 0.09));
        add(G.box, mat.wood, M(0, 0.1, 3.5, 0, 6, 0.2, 1.8));
        add(G.box, mat.door, M(0, 1.1, 2.76, 0, 1.2, 2.2, 0.04));
        for (const x of [-1.75, 1.75]) add(G.box, mat.window, M(x, 1.65, 2.76, 0, 1.0, 1.0, 0.04));
        const sign = new THREE.Mesh(G.plane, own(new THREE.MeshBasicMaterial({ map: own(logoTexture(p.logo, initialsOf(p.name), p.accent, "sign")), transparent: true, toneMapped: false })));
        sign.matrixAutoUpdate = false; sign.matrix.copy(m.clone().multiply(M(0, 4.35, 2.78, 0, 2.3, 2.3, 1)));
        podGroup.add(sign);
        const name = new THREE.Mesh(G.plane, own(new THREE.MeshBasicMaterial({ map: own(textTexture(p.name, { w: 512, h: 72, color: "#f3e3c3", bg: "#2b1d12", family: "Georgia, 'Times New Roman', serif", weight: "700" })), toneMapped: false })));
        name.matrixAutoUpdate = false; name.matrix.copy(m.clone().multiply(M(0, 2.66, 2.79, 0, 4.2, 0.6, 1)));
        podGroup.add(name);
        podProxies.push(addProxy(m.clone().multiply(M(0, 3.2, 0.6, 0, 6, 6.6, 6.4)), district));
      });
    }
    pb.build(podGroup);
    proxies.updateMatrixWorld(true);
  }
  proxies.updateMatrixWorld(true);

  // ---------------------------------------------------------------- agents
  const suitGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const add = (g: THREE.BufferGeometry, m: THREE.Matrix4) => { const x = g.toNonIndexed(); x.applyMatrix4(m); x.deleteAttribute("uv"); parts.push(x); };
    for (const s of [-1, 1]) { add(G.box, M(s * 0.12, 0.27, 0, 0, 0.19, 0.54, 0.22)); add(G.box, M(s * 0.12, 0.06, 0.04, 0, 0.21, 0.12, 0.3)); add(G.box, M(s * 0.34, 0.8, 0, 0, 0.14, 0.5, 0.17, 0, s * 0.12)); }
    add(G.box, M(0, 0.8, 0, 0, 0.52, 0.58, 0.32));
    return keep(mergeGeometries(parts)!);
  })();
  const headGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, color: string) => {
      const x = g.index ? g.toNonIndexed() : g.clone(); x.applyMatrix4(m); x.deleteAttribute("uv");
      const c = new THREE.Color(color), n = x.attributes.position!.count, arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
      x.setAttribute("color", new THREE.BufferAttribute(arr, 3)); parts.push(x);
    };
    add(new THREE.IcosahedronGeometry(0.25, 1), M(0, 1.3, 0), "#eef1f5");
    add(new THREE.SphereGeometry(0.258, 12, 6, Math.PI / 2 - 0.95, 1.9, 1.05, 0.95), M(0, 1.3, 0), "#d9a441");
    add(G.box, M(0, 0.86, -0.24, 0, 0.42, 0.5, 0.18), "#a6adb9");
    add(G.box, M(0, 1.08, 0, 0, 0.36, 0.08, 0.36), "#c9ced8");
    return keep(mergeGeometries(parts)!);
  })();
  const badgeGeo = keep(new THREE.PlaneGeometry(0.3, 0.3).translate(0, 0.84, 0.165));
  const standGeo = (() => {
    const a = G.box.toNonIndexed().applyMatrix4(M(0, 0.5, 0, 0, 0.5, 1.0, 0.32));
    const b = G.box.toNonIndexed().applyMatrix4(M(0, 1.1, 0.02, 0, 0.62, 0.46, 0.08, -0.35));
    const c = G.box.toNonIndexed().applyMatrix4(M(0, 0.03, 0, 0, 0.8, 0.06, 0.6));
    return keep(mergeGeometries([a, b, c])!);
  })();
  const screenGeo = keep(new THREE.PlaneGeometry(0.52, 0.36).applyMatrix4(M(0, 1.11, 0.067, 0, 1, 1, 1, -0.35)));
  const suitMat = lam({});
  const headMat = lam({ vertexColors: true, emissive: "#2a2d33" });
  const screenMat = keep(new THREE.MeshBasicMaterial({ toneMapped: false }));

  type Rt = {
    a: PlanetAgent; i: number;
    pos: THREE.Vector3; rot: number; hop: number; ground: number;
    post: THREE.Vector3; postRot: number; work: THREE.Vector3; workRot: number; term: THREE.Vector3; termRot: number;
    area: (r: () => number) => THREE.Vector3; target: THREE.Vector3; wait: number; moving: boolean;
    name?: THREE.Sprite; tag?: THREE.Sprite; tagKind?: string;
  };
  let rts: Rt[] = [];
  let agentKey = "";
  let suitMesh: THREE.InstancedMesh | null = null, headMesh: THREE.InstancedMesh | null = null, standMesh: THREE.InstancedMesh | null = null, screenMesh: THREE.InstancedMesh | null = null;
  let badgeMeshes: { mesh: THREE.InstancedMesh; members: Rt[]; mat: THREE.Material; tex: THREE.Texture }[] = [];
  const agentGroup = new THREE.Group(); world.add(agentGroup);
  const rnd = Math.random;
  const tagCache = new Map<string, THREE.SpriteMaterial>();
  const tagMat = (text: string, color: string, dot: boolean) => {
    const k = `${text}|${color}|${dot}`;
    if (!tagCache.has(k)) tagCache.set(k, keep(new THREE.SpriteMaterial({ map: keep(tagTexture(text, color, dot)), depthTest: false, transparent: true, toneMapped: false })));
    return tagCache.get(k)!;
  };

  function placeAgents(list: PlanetAgent[]) {
    const old = new Map(rts.map((r) => [r.a.id, r]));
    for (const r of rts) { r.name?.removeFromParent(); r.tag?.removeFromParent(); }
    [suitMesh, headMesh, standMesh, screenMesh].forEach((m) => { if (m) { m.removeFromParent(); m.dispose(); } });
    badgeMeshes.forEach((b) => { b.mesh.removeFromParent(); b.mesh.dispose(); b.mat.dispose(); b.tex.dispose(); });
    badgeMeshes = [];
    const n = list.length;
    rts = list.map((a, i) => {
      let post: THREE.Vector3, postRot: number, work: THREE.Vector3, workRot: number, term: THREE.Vector3, termRot: number, area: Rt["area"], ground = 0;
      if (a.kind === "builder") {
        const builders = list.filter((x) => x.kind === "builder"), k = builders.indexOf(a), K = Math.max(2, builders.length);
        const ang = Math.PI + 0.42 + ((Math.PI - 0.84) * k) / (K - 1);
        const at = (r: number) => new THREE.Vector3(FACTORY.x + Math.cos(ang) * r, 0, FACTORY.z + Math.sin(ang) * r);
        post = at(8.6); term = at(12.4); work = at(11.5);
        postRot = yawFor(-Math.cos(ang), -Math.sin(ang)); termRot = postRot; workRot = postRot + Math.PI;
        const home = post.clone();
        area = (r) => home.clone().add(new THREE.Vector3((r() - 0.5) * 3.4, 0, (r() - 0.5) * 3.4));
      } else if (a.kind === "reviewer") {
        ground = DECK.y;
        term = new THREE.Vector3(DECK.x, DECK.y, DECK.z - 1.6); termRot = 0;
        work = new THREE.Vector3(DECK.x, DECK.y, DECK.z - 0.7); workRot = Math.PI;
        post = new THREE.Vector3(DECK.x, DECK.y, DECK.z + 2.4); postRot = 0;
        area = (r) => new THREE.Vector3(DECK.x + (r() - 0.5) * 6, DECK.y, DECK.z + 1 + r() * 4);
      } else {
        const f = podFrames.get(a.pod);
        const mates = list.filter((x) => x.pod === a.pod), k = mates.indexOf(a), m = mates.length;
        const s = f?.s ?? 1, gap = Math.min(1.6, (5.4 * Math.max(s, 0.6)) / Math.max(1, m)), x = (k - (m - 1) / 2) * gap;
        const fm = f ? M(f.center.x, 0, f.center.z, f.rot) : new THREE.Matrix4();
        const loc = (lx: number, lz: number) => new THREE.Vector3(lx, 0, lz).applyMatrix4(fm).setY(f?.ground ?? 0);
        ground = f?.ground ?? 0;
        term = loc(x, 2.6 * s + 1.4); termRot = (f?.rot ?? 0);
        work = loc(x, 2.6 * s + 2.2); workRot = (f?.rot ?? 0) + Math.PI;
        post = loc(x, 2.6 * s + (s < 0.8 ? 3.4 : 4.6)); postRot = f?.rot ?? 0;
        area = (r) => loc((r() - 0.5) * 5 * Math.max(s, 0.6), 2.6 * s + 3 + r() * (s < 0.8 ? 1.4 : 3.6));
      }
      const prev = old.get(a.id);
      const pos = prev ? prev.pos.clone() : (reduced ? post.clone() : area(rnd));
      return { a, i, pos, rot: prev?.rot ?? postRot, hop: 0, ground, post, postRot, work, workRot, term, termRot, area, target: pos.clone(), wait: rnd() * 3, moving: false };
    });
    if (!n) return;
    suitMesh = new THREE.InstancedMesh(suitGeo, suitMat, n);
    headMesh = new THREE.InstancedMesh(headGeo, headMat, n);
    standMesh = new THREE.InstancedMesh(standGeo, mat.metal, n);
    screenMesh = new THREE.InstancedMesh(screenGeo, screenMat, n);
    for (const mm of [suitMesh, headMesh, standMesh, screenMesh]) { mm.frustumCulled = false; mm.instanceMatrix.setUsage(THREE.DynamicDrawUsage); agentGroup.add(mm); }
    const tmp = new THREE.Matrix4();
    rts.forEach((r) => {
      suitMesh!.setColorAt(r.i, new THREE.Color(r.a.color));
      tmp.copy(M(r.term.x, r.ground, r.term.z, r.termRot));
      standMesh!.setMatrixAt(r.i, tmp); screenMesh!.setMatrixAt(r.i, tmp);
    });
    standMesh.instanceMatrix.needsUpdate = true;
    const groups = new Map<string, Rt[]>();
    for (const r of rts) { const k = `${r.a.logo ?? ""}|${r.a.badge}|${r.a.logo ? "" : r.a.color}`; groups.set(k, [...(groups.get(k) ?? []), r]); }
    for (const [, members] of groups) {
      const a = members[0]!.a;
      const t = logoTexture(a.logo, a.badge, a.logo ? "#ffb84d" : a.color, "badge");
      const bm = new THREE.MeshBasicMaterial({ map: t, transparent: true, alphaTest: 0.1, toneMapped: false });
      const mesh = new THREE.InstancedMesh(badgeGeo, bm, members.length);
      mesh.frustumCulled = false; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      agentGroup.add(mesh);
      badgeMeshes.push({ mesh, members, mat: bm, tex: t });
    }
    refreshStatus();
  }

  function refreshStatus() {
    if (!screenMesh) return;
    const off = new THREE.Color("#0c1220");
    for (const r of rts) {
      const busy = isBusy(r.a.status);
      screenMesh.setColorAt(r.i, busy ? new THREE.Color(r.a.color).lerp(new THREE.Color("#ffffff"), 0.25) : off);
      const kind = busy ? r.a.status : "";
      if (kind !== r.tagKind) {
        r.tag?.removeFromParent(); r.tag = undefined; r.tagKind = kind;
        if (busy) { r.tag = new THREE.Sprite(tagMat(r.a.status === "reviewing" ? "REVIEWING" : "WORKING", "#ffb84d", true)); r.tag.scale.set(1.5, 0.375, 1); r.tag.renderOrder = 10; agentGroup.add(r.tag); }
      }
    }
    if (screenMesh.instanceColor) screenMesh.instanceColor.needsUpdate = true;
  }

  // ---------------------------------------------------------------- packets (only for real events)
  type Packet = { from: Rt; to: Rt; t: number; dur: number; mesh: THREE.Mesh; glow: THREE.Sprite; h: number };
  const packets: Packet[] = [];
  const packetGeo = keep(new THREE.IcosahedronGeometry(0.16, 0));
  const packetMat = keep(new THREE.MeshBasicMaterial({ color: "#ffd27a", toneMapped: false }));
  const glowMat = (() => {
    const [c, g] = canvas(64, 64);
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 32); gr.addColorStop(0, "rgba(255,210,122,1)"); gr.addColorStop(1, "rgba(255,184,77,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return keep(new THREE.SpriteMaterial({ map: keep(tex(c)), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
  })();

  // ---------------------------------------------------------------- selection ring
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(0.45, 0.58, 24).rotateX(-Math.PI / 2)), keep(new THREE.MeshBasicMaterial({ color: "#ffb84d", toneMapped: false, transparent: true, opacity: 0.9 })));
  ring.visible = false; world.add(ring);
  let selected: string | null = null;

  // ---------------------------------------------------------------- player
  const player = { pos: new THREE.Vector3(0, 0, 13), ground: 0, yaw: 0, pitch: -0.04, vel: new THREE.Vector3(), jump: 0, vy: 0, walked: 0 };
  let mode: string | null = null;
  type Pose = { pos: THREE.Vector3; ground: number; yaw: number; pitch: number };
  let tween: { from: Pose; to: Pose; via: THREE.Vector3 | null; t: number; dur: number } | null = null;
  const keys = new Set<string>();
  const joy = { x: 0, y: 0 };

  const inStreet = (x: number, z: number) => (Math.abs(x) <= STREET.half && z >= STREET.zMin && z <= STREET.zMax) || Math.hypot(x - FACTORY.x, z - FACTORY.z) <= PLAZA_R - 0.6;
  const builderBlock = (x: number, z: number) => Math.hypot(x - FACTORY.x, z - FACTORY.z) < 2.8;
  function allowed(x: number, z: number): boolean {
    const lot = LOTS.find((l) => l.id === mode);
    if (lot) {
      const u = lot.side * x - GATE_X, v = z - lot.zc;
      if (u < 0.8 || u > LOT_U - 0.8 || Math.abs(v) > LOT_V - 0.8) return false;
      for (const [, f] of podFrames) if (f.district === lot.id && Math.hypot(x - f.center.x, z - f.center.z) < 3.6 * f.s + 0.4) return false;
      return true;
    }
    if (mode === "deck") return Math.hypot(x - DECK.x, z - DECK.z) <= DECK_R - 0.6 && Math.hypot(x - DECK.x, z - (DECK.z - 1.2)) > 1.1;
    return inStreet(x, z) && !builderBlock(x, z);
  }

  function poseFor(id: string | null, from: THREE.Vector3): Pose {
    const lot = LOTS.find((l) => l.id === id);
    // on a tall phone screen the panel covers the bottom half, so look a little further down to lift the agents into view
    const portrait = camera.aspect < 0.8;
    if (lot) return { pos: lotWorld(lot, portrait ? 1.6 : 3.2, 0), ground: 0, yaw: lot.side < 0 ? Math.PI / 2 : -Math.PI / 2, pitch: portrait ? -0.26 : -0.1 };
    if (id === "factory") return { pos: new THREE.Vector3(0, 0, FACTORY.z + 15), ground: 0, yaw: 0, pitch: portrait ? -0.22 : -0.06 };
    if (id === "deck") return { pos: new THREE.Vector3(DECK.x, 0, DECK.z + 7.6), ground: DECK.y, yaw: 0, pitch: -0.14 };
    // back to Main Street: in front of the gate we came out of
    const prev = LOTS.find((l) => l.id === mode);
    if (prev) return { pos: new THREE.Vector3(prev.side * 3.8, 0, prev.zc - 1), ground: 0, yaw: prev.side < 0 ? -0.5 : 0.5, pitch: -0.04 };
    if (mode === "deck") return { pos: new THREE.Vector3(0, 0, FACTORY.z + 12), ground: 0, yaw: 0, pitch: 0.02 };
    return { pos: from.clone(), ground: 0, yaw: player.yaw, pitch: player.pitch };
  }

  function enter(id: string | null) {
    if (id === mode) return;
    const to = poseFor(id, player.pos);
    const lot = LOTS.find((l) => l.id === (id ?? mode));
    const via = lot ? new THREE.Vector3(lot.side * (GATE_X + 0.5), 0, lot.zc) : null;
    // the plaza is part of the street: if we're already standing in it, just open the panel
    if (id === "factory" && mode === null && Math.hypot(player.pos.x - FACTORY.x, player.pos.z - FACTORY.z) < PLAZA_R + 4) { mode = id; nameTags(); return; }
    mode = id;
    player.vel.set(0, 0, 0); player.vy = 0; player.jump = 0;
    if (reduced) { player.pos.copy(to.pos); player.ground = to.ground; player.yaw = to.yaw; player.pitch = to.pitch; tween = null; }
    else tween = { from: { pos: player.pos.clone(), ground: player.ground, yaw: player.yaw, pitch: player.pitch }, to, via, t: 0, dur: 1.5 };
    nameTags();
  }

  function nameTags() {
    for (const r of rts) {
      const show = mode !== null && r.a.district === mode;
      if (show && !r.name) {
        r.name = new THREE.Sprite(tagMat(r.a.name, "#e2e6ed", false)); r.name.scale.set(1.2, 0.3, 1); r.name.renderOrder = 9; agentGroup.add(r.name);
      } else if (!show && r.name) { r.name.removeFromParent(); r.name = undefined; }
    }
  }

  // ---------------------------------------------------------------- input
  const el = renderer.domElement;
  el.tabIndex = -1;
  let drag: { id: number; x: number; y: number; sx: number; sy: number; t: number; moved: boolean } | null = null;
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(clientX: number, clientY: number): { agent?: string; district?: string } {
    const rect = el.getBoundingClientRect();
    ndc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    ray.far = 120;
    const targets: THREE.Object3D[] = [];
    for (const m of [suitMesh, headMesh]) if (m) { m.boundingSphere = null; targets.push(m); }
    const hitA = ray.intersectObjects(targets, false)[0];
    const hitP = ray.intersectObjects(proxies.children, false)[0];
    if (hitA && hitA.instanceId !== undefined && (!hitP || hitA.distance < hitP.distance + 3)) return { agent: rts[hitA.instanceId]?.a.id };
    if (hitP) return { district: hitP.object.userData.district as string };
    return {};
  }
  const onDown = (e: PointerEvent) => {
    if (drag) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: false };
    el.setPointerCapture(e.pointerId);
    el.focus({ preventScroll: true });
  };
  let lastHover = 0;
  const onMove = (e: PointerEvent) => {
    if (drag && e.pointerId === drag.id) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.x = e.clientX; drag.y = e.clientY;
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true;
      if (drag.moved) {
        const k = e.pointerType === "touch" ? 0.0065 : 0.0045;
        player.yaw -= dx * k; player.pitch = Math.max(-1.1, Math.min(1.0, player.pitch - dy * k));
        if (tween) tween = null;
      }
      return;
    }
    if (e.pointerType === "mouse") {
      const now = performance.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      const p = pick(e.clientX, e.clientY);
      el.style.cursor = p.agent || p.district ? "pointer" : "grab";
    }
  };
  const onUp = (e: PointerEvent) => {
    if (!drag || e.pointerId !== drag.id) return;
    const click = !drag.moved && performance.now() - drag.t < 600;
    drag = null;
    if (!click) return;
    const p = pick(e.clientX, e.clientY);
    if (p.agent) cb.onPickAgent(p.agent);
    else if (p.district) cb.onPickDistrict(p.district);
  };
  const onCancel = () => { drag = null; };
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onCancel);
  const typing = (e: KeyboardEvent) => { const t = e.target as HTMLElement | null; return !!t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable); };
  const MOVE_KEYS = ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "KeyQ", "KeyE", "Space", "ShiftLeft", "ShiftRight"];
  const onKeyDown = (e: KeyboardEvent) => {
    if (typing(e) || e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code === "Escape") { if (mode) cb.onRequestExit(); return; }
    if (!MOVE_KEYS.includes(e.code)) return;
    const active = document.activeElement;
    const onStage = !active || active === document.body || container.contains(active) || active === el;
    if (!onStage) return;
    if (e.code.startsWith("Arrow") || e.code === "Space") e.preventDefault();
    keys.add(e.code);
  };
  const onKeyUp = (e: KeyboardEvent) => { keys.delete(e.code); };
  const onBlur = () => keys.clear();
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);

  // ---------------------------------------------------------------- frame loop
  const resize = () => {
    const w = container.clientWidth || 1, h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 78 : 68;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize); ro.observe(container); resize();

  let raf = 0, last = performance.now(), running = true, lastLoc = "";
  const tmpM = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), v3 = new THREE.Vector3();
  const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const angLerp = (a: number, b: number, t: number) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return a + d * t; };

  function stepPlayer(dt: number, realDt: number) {
    if (tween) {
      tween.t = Math.min(1, tween.t + realDt / tween.dur);
      const k = ease(tween.t), { from, to, via } = tween;
      if (via) { const a = 1 - k; player.pos.set(a * a * from.pos.x + 2 * a * k * via.x + k * k * to.pos.x, 0, a * a * from.pos.z + 2 * a * k * via.z + k * k * to.pos.z); }
      else player.pos.lerpVectors(from.pos, to.pos, k);
      player.ground = from.ground + (to.ground - from.ground) * k;
      player.yaw = angLerp(from.yaw, to.yaw, k); player.pitch = from.pitch + (to.pitch - from.pitch) * k;
      if (tween.t >= 1) tween = null;
      return 0;
    }
    let f = 0, s = 0, turn = 0;
    if (keys.has("KeyW") || keys.has("ArrowUp")) f += 1;
    if (keys.has("KeyS") || keys.has("ArrowDown")) f -= 1;
    if (keys.has("KeyD")) s += 1;
    if (keys.has("KeyA")) s -= 1;
    if (keys.has("ArrowLeft") || keys.has("KeyQ")) turn += 1;
    if (keys.has("ArrowRight") || keys.has("KeyE")) turn -= 1;
    f += -joy.y; s += joy.x;
    player.yaw += turn * 1.9 * dt;
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const speed = keys.has("ShiftLeft") || keys.has("ShiftRight") ? 7.5 : 4.4;
    const fx = -Math.sin(player.yaw), fz = -Math.cos(player.yaw), rx = Math.cos(player.yaw), rz = -Math.sin(player.yaw);
    const want = v3.set((fx * f + rx * s) * speed, 0, (fz * f + rz * s) * speed);
    if (reduced) player.vel.copy(want); else player.vel.lerp(want, 1 - Math.exp(-3.2 * dt)); // low gravity: a little slide
    const nx = player.pos.x + player.vel.x * dt, nz = player.pos.z + player.vel.z * dt;
    // walking into an open gate enters that district; walking out of it returns to the street
    const lotNow = LOTS.find((l) => l.id === mode);
    if (!mode) {
      for (const l of LOTS) if (l.side * nx > STREET.half - 0.1 && Math.abs(nz - l.zc) < 3 && l.side * player.vel.x > 0.5) { cb.onPickDistrict(l.id); break; }
      if (Math.abs(nx - DECK.x) < 2.5 && nz < FACTORY.z - PLAZA_R + 1.6 && player.vel.z < -0.5) cb.onPickDistrict("deck");
    } else if (lotNow) {
      const u = lotNow.side * nx - GATE_X, v = nz - lotNow.zc;
      if (u < 0.9 && Math.abs(v) < 3.2 && lotNow.side * player.vel.x < -0.5) cb.onRequestExit();
    } else if (mode === "deck" && nz > DECK.z + DECK_R - 0.7 && Math.abs(nx - DECK.x) < 2 && player.vel.z > 0.5) cb.onRequestExit();
    if (allowed(nx, nz)) { player.pos.x = nx; player.pos.z = nz; }
    else if (allowed(nx, player.pos.z)) { player.pos.x = nx; player.vel.z = 0; }
    else if (allowed(player.pos.x, nz)) { player.pos.z = nz; player.vel.x = 0; }
    else player.vel.set(0, 0, 0);
    if (keys.has("Space") && player.jump === 0) player.vy = 3.1;
    if (player.vy !== 0 || player.jump > 0) { player.vy -= 3.2 * dt; player.jump = Math.max(0, player.jump + player.vy * dt); if (player.jump === 0) player.vy = 0; }
    const moved = Math.hypot(player.vel.x, player.vel.z) * dt;
    player.walked += moved;
    return moved;
  }

  function stepAgents(dt: number, t: number) {
    if (!suitMesh || !headMesh || !screenMesh) return;
    for (const r of rts) {
      const busy = isBusy(r.a.status);
      const anchor = busy ? r.work : r.post, anchorRot = busy ? r.workRot : r.postRot;
      if (reduced) { r.pos.copy(anchor); r.rot = anchorRot; r.hop = 0; r.moving = false; }
      else {
        const atPosts = busy || r.a.status === "standby" || mode === r.a.district || selected === r.a.id;
        if (atPosts) r.target.copy(anchor);
        else if (!r.moving) { r.wait -= dt; if (r.wait <= 0) { r.target.copy(r.area(rnd)); r.wait = 2.5 + rnd() * 5; } }
        const dx = r.target.x - r.pos.x, dz = r.target.z - r.pos.z, d = Math.hypot(dx, dz);
        if (d > 0.06) {
          r.moving = true;
          const sp = Math.min(d, (busy ? 2.2 : 1.1) * dt);
          r.pos.x += (dx / d) * sp; r.pos.z += (dz / d) * sp;
          r.rot = angLerp(r.rot, Math.atan2(dx, dz), 1 - Math.exp(-8 * dt));
          r.hop += dt * 5.5;
        } else {
          r.moving = false;
          if (atPosts || r.target.distanceTo(anchor) < 0.1) r.rot = angLerp(r.rot, anchorRot, 1 - Math.exp(-6 * dt));
          r.hop = 0;
        }
      }
      // a low-gravity lope while walking; a small typing nod only while really working at the terminal
      const y = r.ground + (r.moving ? Math.abs(Math.sin(r.hop)) * 0.2 : busy && !reduced && r.pos.distanceTo(r.work) < 0.1 ? Math.abs(Math.sin(t * 7 + r.i)) * 0.025 : 0);
      tmpM.compose(v3.set(r.pos.x, y, r.pos.z), q.setFromAxisAngle(up, r.rot), one.set(1.1, 1.1, 1.1));
      suitMesh.setMatrixAt(r.i, tmpM); headMesh.setMatrixAt(r.i, tmpM);
      if (r.tag) r.tag.position.set(r.pos.x, y + 2.05, r.pos.z);
      if (r.name) r.name.position.set(r.pos.x, y + (r.tag ? 2.45 : 1.95) + (r.i % 2) * 0.34, r.pos.z);
      if (selected === r.a.id) { ring.visible = true; ring.position.set(r.pos.x, r.ground + 0.04, r.pos.z); }
    }
    suitMesh.instanceMatrix.needsUpdate = true; headMesh.instanceMatrix.needsUpdate = true;
    for (const b of badgeMeshes) {
      b.members.forEach((r, j) => { suitMesh!.getMatrixAt(r.i, tmpM); b.mesh.setMatrixAt(j, tmpM); });
      b.mesh.instanceMatrix.needsUpdate = true;
    }
  }

  function stepPackets(dt: number) {
    for (let i = packets.length - 1; i >= 0; i--) {
      const p = packets[i]!;
      p.t += dt / p.dur;
      const k = Math.min(1, p.t);
      const a = v3.set(p.from.pos.x, p.from.ground + 1.0, p.from.pos.z), b = new THREE.Vector3(p.to.pos.x, p.to.ground + 1.0, p.to.pos.z);
      if (reduced) p.mesh.position.copy(b); else p.mesh.position.lerpVectors(a, b, k).setY(a.y + (b.y - a.y) * k + Math.sin(Math.PI * k) * p.h);
      p.glow.position.copy(p.mesh.position);
      if (p.t >= 1) {
        const fade = 1 - Math.min(1, (p.t - 1) * 3);
        p.glow.scale.setScalar(0.9 + (1 - fade) * 1.6); (p.glow.material as THREE.SpriteMaterial).opacity = fade;
        if (fade <= 0) { p.mesh.removeFromParent(); p.glow.removeFromParent(); (p.glow.material as THREE.Material).dispose(); packets.splice(i, 1); }
      }
    }
  }

  function locationLabel() {
    if (mode) return mode;
    const z = player.pos.z;
    if (Math.hypot(player.pos.x - FACTORY.x, z - FACTORY.z) < PLAZA_R + 2) return "street:factory";
    let best: Lot | null = null;
    for (const l of LOTS) if (Math.abs(z - l.zc) < 11) best = l;
    return best ? `street:${best.id}` : z > 0 ? "street:arrival" : "street";
  }

  const loop = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const realDt = Math.min(0.5, (now - last) / 1000), dt = Math.min(0.05, realDt); last = now;
    const t = now / 1000;
    const moved = stepPlayer(dt, realDt);
    const bob = reduced ? 0 : Math.sin(player.walked * 2.1) * 0.05 * Math.min(1, moved / (dt * 3 + 1e-6));
    camera.position.set(player.pos.x, player.ground + EYE + player.jump + bob, player.pos.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    sky.position.set(camera.position.x, 0, camera.position.z);
    ring.visible = false;
    stepAgents(dt, t);
    stepPackets(dt);
    if (!reduced) for (const [i, h] of holograms.entries()) (h.material as THREE.MeshBasicMaterial).opacity = 0.78 + Math.sin(t * 1.3 + i) * 0.12;
    renderer.render(scene, camera);
    const loc = locationLabel();
    if (loc !== lastLoc) { lastLoc = loc; cb.onLocation(loc); }
  };
  const onVis = () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); keys.clear(); }
    else if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(loop); }
  };
  document.addEventListener("visibilitychange", onVis);
  raf = requestAnimationFrame(loop);

  // ---------------------------------------------------------------- public API
  return {
    sync(pods, agents) {
      const pk = pods.map((p) => `${p.slug}@${p.district}`).join(",");
      if (pk !== podKey) { podKey = pk; buildPods(pods); agentKey = ""; }
      const ak = agents.map((a) => `${a.id}@${a.pod}`).join(",");
      if (ak !== agentKey) { agentKey = ak; placeAgents(agents); nameTags(); }
      else { agents.forEach((a, i) => { if (rts[i]) rts[i]!.a = a; }); refreshStatus(); }
    },
    enter,
    select(id) { selected = id; },
    event(e) {
      const from = rts.find((r) => r.a.id === e.from), to = rts.find((r) => r.a.id === e.to);
      if (!from || !to) return;
      const mesh = new THREE.Mesh(packetGeo, packetMat);
      const glow = new THREE.Sprite(glowMat.clone()); glow.scale.setScalar(0.9);
      world.add(mesh); world.add(glow);
      const dist = from.pos.distanceTo(to.pos);
      packets.push({ from, to, t: 0, dur: reduced ? 1.5 : Math.min(4, 1.6 + dist / 14), mesh, glow, h: Math.min(6, 0.8 + dist * 0.18) });
    },
    setJoystick(x, y) { joy.x = x; joy.y = y; },
    dispose() {
      running = false; cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("blur", onBlur);
      el.removeEventListener("pointerdown", onDown); el.removeEventListener("pointermove", onMove); el.removeEventListener("pointerup", onUp); el.removeEventListener("pointercancel", onCancel);
      scene.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && !Object.values(G).includes(m.geometry as never)) m.geometry.dispose(); });
      [suitMesh, headMesh, standMesh, screenMesh].forEach((m) => m?.dispose());
      badgeMeshes.forEach((b) => { b.mesh.dispose(); b.mat.dispose(); b.tex.dispose(); });
      podDisposables.forEach((d) => d.dispose());
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      el.remove();
    },
  };
}

function initialsOf(name: string) {
  return name.replace(/^the\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("") || "?";
}
