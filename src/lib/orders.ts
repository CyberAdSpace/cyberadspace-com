// Brand Starter orders: types and storage (private Vercel Blob store).
import { put, get, list } from "@vercel/blob";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

// LOCAL_STORE_DIR lets the whole flow run on a laptop without Vercel Blob (testing only).
const LOCAL = () => process.env.LOCAL_STORE_DIR;
async function localWrite(p: string, data: string | Buffer) { const f = path.join(LOCAL()!, p); await fs.mkdir(path.dirname(f), { recursive: true }); await fs.writeFile(f, data); }
async function localRead(p: string) { return fs.readFile(path.join(LOCAL()!, p)).catch(() => null); }

export const PRICE_USD = 350;
export const MAX_REVISIONS = 2;

export const STEP_KEYS = ["brief", "names", "kit", "logo", "site", "storefront", "launch"] as const;
export type StepKey = (typeof STEP_KEYS)[number];

export const STEP_LABELS: Record<StepKey, string> = {
  brief: "Brand brief",
  names: "Brand names",
  kit: "Brand kit",
  logo: "Logo",
  site: "One-page website",
  storefront: "Marketplace storefront",
  launch: "Launch kit",
};

// Steps that depend on an earlier one; redoing a step also redoes these.
export const DEPENDENTS: Record<StepKey, StepKey[]> = {
  brief: ["names", "kit", "logo", "site", "storefront", "launch"],
  names: ["kit", "logo", "site", "storefront", "launch"],
  kit: ["logo", "site", "storefront", "launch"],
  logo: [],
  site: [],
  storefront: [],
  launch: [],
};

export type Product = { name: string; price: string; details: string };

export type Intake = {
  idea: string;
  audience: string;
  products: Product[];
  style: string[];
  colorsLike: string;
  colorsAvoid: string;
  nameIdeas: string;
  admire: string;
  languages: string;
  ownDomain: string;
};

export type Step = {
  status: "pending" | "running" | "done" | "error";
  output?: unknown;
  error?: string;
  notes?: string[]; // reviewer / customer notes applied on the next run
  updatedAt?: string;
};

export type OrderStatus =
  | "awaiting_payment"
  | "queued"
  | "generating"
  | "review"
  | "delivered"
  | "revision_requested"
  | "failed";

export type Order = {
  id: string;
  token: string; // secret for the customer's order page
  createdAt: string;
  updatedAt: string;
  status: OrderStatus;
  paid: boolean;
  paidVia?: string;
  stripeSessionId?: string;
  xprTx?: string; // WebAuth (XPR Network) transaction id submitted for payment
  customer: { name: string; email: string };
  intake: Intake;
  slug?: string;
  steps: Record<StepKey, Step>;
  revisionsUsed: number;
  mock?: boolean;
  history: { at: string; event: string; note?: string }[];
};

export const STATUS_LABEL: Record<OrderStatus, string> = {
  awaiting_payment: "Awaiting payment",
  queued: "Queued",
  generating: "Building",
  review: "Needs your review",
  delivered: "Delivered",
  revision_requested: "Customer revision",
  failed: "Needs attention",
};

const PREFIX = "brand-orders/";

export function newOrder(customer: Order["customer"], intake: Intake): Order {
  const now = new Date().toISOString();
  const steps = Object.fromEntries(STEP_KEYS.map((k) => [k, { status: "pending" }])) as Record<StepKey, Step>;
  return {
    id: crypto.randomBytes(6).toString("hex"),
    token: crypto.randomBytes(18).toString("base64url"),
    createdAt: now,
    updatedAt: now,
    status: "awaiting_payment",
    paid: false,
    customer,
    intake,
    steps,
    revisionsUsed: 0,
    history: [{ at: now, event: "Order submitted" }],
  };
}

export function blobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || LOCAL());
}

export async function saveOrder(order: Order) {
  order.updatedAt = new Date().toISOString();
  if (LOCAL()) { await localWrite(`${PREFIX}${order.id}.json`, JSON.stringify(order)); return order; }
  await put(`${PREFIX}${order.id}.json`, JSON.stringify(order), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60,
  });
  return order;
}

async function readText(pathname: string) {
  if (LOCAL()) return (await localRead(pathname))?.toString("utf8") ?? null;
  const res = await get(pathname, { access: "private", useCache: false });
  if (!res || res.statusCode !== 200) return null;
  return await new Response(res.stream).text();
}

export async function getOrder(id: string): Promise<Order | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null;
  const text = await readText(`${PREFIX}${id}.json`).catch(() => null);
  return text ? (JSON.parse(text) as Order) : null;
}

export async function listOrders(): Promise<Order[]> {
  const out: Order[] = [];
  if (LOCAL()) {
    const files = await fs.readdir(path.join(LOCAL()!, PREFIX)).catch(() => [] as string[]);
    for (const f of files.filter((x) => x.endsWith(".json"))) { const o = await getOrder(f.slice(0, -5)); if (o) out.push(o); }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of page.blobs) {
      if (!b.pathname.endsWith(".json")) continue;
      const id = b.pathname.slice(PREFIX.length, -5);
      const o = await getOrder(id);
      if (o) out.push(o);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findBySlug(slug: string): Promise<Order | null> {
  const all = await listOrders();
  return all.find((o) => o.slug === slug) ?? null;
}

// Binary assets (logo images) live next to the order.
export async function saveAsset(orderId: string, name: string, data: Buffer, contentType: string) {
  if (LOCAL()) { await localWrite(`${PREFIX}${orderId}/${name}`, data); return `/api/brand-asset/${orderId}/${name}`; }
  await put(`${PREFIX}${orderId}/${name}`, data, {
    access: "private",
    contentType,
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return `/api/brand-asset/${orderId}/${name}`;
}

export async function readAsset(orderId: string, name: string) {
  if (!/^[a-f0-9]{12}$/.test(orderId) || !/^[a-z0-9-]+\.(png|webp|jpg)$/.test(name)) return null;
  if (LOCAL()) {
    const buf = await localRead(`${PREFIX}${orderId}/${name}`);
    return buf ? { stream: new Response(new Uint8Array(buf)).body!, blob: { contentType: "image/png" } } : null;
  }
  const res = await get(`${PREFIX}${orderId}/${name}`, { access: "private" }).catch(() => null);
  return res && res.statusCode === 200 ? res : null;
}

export function log(order: Order, event: string, note?: string) {
  order.history.push({ at: new Date().toISOString(), event, note });
}

export function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

// Typed accessors for step outputs.
export type Brief = { summary: string; audience: string; personality: string[]; keyMessages: string[] };
export type NameOption = { name: string; why: string; domain: string; domainAvailable?: boolean | null };
export type NamesOut = { options: NameOption[]; selected: string };
export type Kit = {
  tagline: string;
  story: string;
  voice: string;
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  fonts: { heading: string; body: string };
};
export type LogoOut = { iconUrl: string; prompt: string };
export type SiteOut = {
  heroHeadline: string;
  heroSub: string;
  ctaLabel: string;
  about: string;
  features: { title: string; text: string }[];
  faq: { q: string; a: string }[];
};
export type StorefrontOut = { products: { name: string; price: string; short: string; description: string }[] };
export type LaunchOut = { bio: string; posts: { platform: string; caption: string; hashtags: string[] }[] };

export function out<T>(order: Order, key: StepKey): T | undefined {
  return order.steps[key]?.output as T | undefined;
}
