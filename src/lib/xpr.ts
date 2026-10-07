// XPR Network (WebAuth wallet) payments. Customers pay in Metal Dollar (XMD), which is pegged 1:1 to USD.
// Set NEXT_PUBLIC_XPR_ACCOUNT to the studio's WebAuth account name to turn this on.
export const XPR_ACCOUNT = (process.env.NEXT_PUBLIC_XPR_ACCOUNT ?? "").trim().toLowerCase();
export const XPR_CHAIN_ID = "384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0"; // XPR Network mainnet
export const XPR_ENDPOINTS = ["https://rpc.api.mainnet.metalx.com", "https://proton.eosusa.io", "https://proton.greymass.com", "https://api.protonnz.com"];
export const XMD_CONTRACT = "xmd.token";
export const XMD_SYMBOL = "XMD";
export const XMD_PRECISION = 6;

export function xprConfigured() {
  return /^[a-z1-5.]{1,12}$/.test(XPR_ACCOUNT);
}

export function xmdQuantity(usd: number) {
  return `${usd.toFixed(XMD_PRECISION)} ${XMD_SYMBOL}`;
}

export function explorerTx(txId: string) {
  return `https://explorer.xprnetwork.org/transaction/${txId}`;
}

type Verdict = { ok: true } | { ok: false; reason: "not_found" | "mismatch" | "unreachable" };

// Look the transaction up on the chain's history API and confirm it is a transfer of at least
// `usd` XMD from the XMD contract to our account, with the order id as the memo.
export async function verifyXmdPayment(txId: string, orderId: string, usd: number): Promise<Verdict> {
  if (!/^[0-9a-f]{64}$/.test(txId)) return { ok: false, reason: "mismatch" };
  let reached = false;
  for (const base of ["https://proton.eosusa.io", "https://api.protonnz.com", "https://proton.cryptolions.io"]) {
    try {
      const res = await fetch(`${base}/v2/history/get_transaction?id=${txId}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!res.ok && res.status !== 404) continue;
      reached = true;
      if (res.status === 404) continue;
      const body = await res.json();
      if (body?.executed === false) return { ok: false, reason: "mismatch" };
      const actions: { act?: { account?: string; name?: string; data?: Record<string, unknown> } }[] = body?.actions ?? [];
      if (!actions.length) continue;
      const hit = actions.some(({ act }) => {
        if (act?.account !== XMD_CONTRACT || act?.name !== "transfer") return false;
        const d = act.data ?? {};
        const qty = String(d.quantity ?? `${d.amount ?? ""} ${d.symbol ?? ""}`).trim();
        const [amt, sym] = qty.split(" ");
        return String(d.to) === XPR_ACCOUNT && String(d.memo ?? "").trim() === orderId && sym === XMD_SYMBOL && Number(amt) >= usd - 1e-6;
      });
      return hit ? { ok: true } : { ok: false, reason: "mismatch" };
    } catch { /* try the next endpoint */ }
  }
  return { ok: false, reason: reached ? "not_found" : "unreachable" };
}
