import crypto from "node:crypto";
import { STEP_KEYS, STEP_LABELS, out, type NamesOut, type Order, type StepKey } from "./orders";

/** The agents shown in the arcade: one per build step. */
export const AGENTS = STEP_KEYS.map((key) => ({ key, label: STEP_LABELS[key] }));

export type ArcadeOrder = {
  code: string; // short public code, never the real order id
  label: string; // brand name only once delivered (or for the order's own customer)
  status: Order["status"];
  steps: Record<StepKey, "pending" | "running" | "done" | "error">;
  updatedAt: string;
};

export type ArcadeFeed = { now: string; live: boolean; agents: typeof AGENTS; orders: ArcadeOrder[] };

/** Public view of an order: no customer details, no brand name until it's delivered. */
export function toArcade(o: Order, showName = false): ArcadeOrder {
  const code = crypto.createHash("sha256").update(o.id).digest("hex").slice(0, 4).toUpperCase();
  const name = out<NamesOut>(o, "names")?.selected;
  return {
    code,
    label: (showName || o.status === "delivered") && name ? name : `Brand #${code}`,
    status: o.status,
    steps: Object.fromEntries(STEP_KEYS.map((k) => [k, o.steps[k]?.status ?? "pending"])) as ArcadeOrder["steps"],
    updatedAt: o.updatedAt,
  };
}

/** Orders worth showing: paid, and either in progress or finished in the last 7 days. */
export function arcadeOrders(all: Order[], limit = 6): ArcadeOrder[] {
  const week = Date.now() - 7 * 864e5;
  return all
    .filter((o) => o.paid && o.status !== "awaiting_payment")
    .filter((o) => o.status === "queued" || o.status === "generating" || o.status === "revision_requested" || Date.parse(o.updatedAt) > week)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
    .map((o) => toArcade(o));
}

export function isLive(orders: ArcadeOrder[]) {
  return orders.some((o) => Object.values(o.steps).includes("running") || o.status === "queued" || o.status === "generating");
}
