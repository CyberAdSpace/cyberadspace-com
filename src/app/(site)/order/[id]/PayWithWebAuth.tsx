"use client";
import { useState } from "react";

type Props = { orderId: string; token: string; account: string; quantity: string; chainId: string; endpoints: string[]; contract: string };
type State = { kind: "idle" | "working" | "pending" | "paid" } | { kind: "error"; message: string };

export default function PayWithWebAuth({ orderId, token, account, quantity, chainId, endpoints, contract }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function report(txId: string) {
    for (let attempt = 0; attempt < 4; attempt++) {
      const res = await fetch(`/api/order/${orderId}/xpr`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ t: token, txId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setState({ kind: "error", message: data.error ?? "We couldn't confirm the payment. Email us with your order number." }); return; }
      if (data.status === "paid") { setState({ kind: "paid" }); setTimeout(() => location.reload(), 1500); return; }
      await new Promise((r) => setTimeout(r, 4000)); // the history service can lag a few seconds behind the chain
    }
    setState({ kind: "pending" });
  }

  async function pay() {
    setState({ kind: "working" });
    try {
      const { default: ProtonWebSDK } = await import("@proton/web-sdk");
      const { session } = await ProtonWebSDK({
        linkOptions: { chainId, endpoints, restoreSession: false },
        transportOptions: { requestAccount: account },
        selectorOptions: { enabledWalletTypes: ["proton", "webauth"] },
        uiOptions: { appInfo: { name: "CyberAdSpace", logo: `${location.origin}/icon.png` } },
      });
      if (!session) { setState({ kind: "idle" }); return; }
      const actor = String(session.auth.actor);
      const permission = String(session.auth.permission);
      const result = await session.transact(
        { actions: [{ account: contract, name: "transfer", authorization: [{ actor, permission }], data: { from: actor, to: account, quantity, memo: orderId } }] },
        { broadcast: true },
      );
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const r = result as any;
      const txId: string | undefined = r?.processed?.id ?? r?.payload?.tx ?? r?.transaction?.id?.toString();
      if (!txId) { setState({ kind: "error", message: "The wallet didn't return a transaction id. If you were charged, email us with your order number." }); return; }
      await report(String(txId));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/cancel|closed|reject|denied/i.test(msg)) { setState({ kind: "idle" }); return; }
      setState({ kind: "error", message: /overdrawn|balance/i.test(msg) ? `Your wallet doesn't have enough XMD. You need ${quantity}.` : "The payment didn't go through. Nothing was charged. Please try again." });
    }
  }

  if (state.kind === "paid") return <p className="ok-note">Payment confirmed. We&apos;re building your brand now.</p>;
  if (state.kind === "pending") return <p className="ok-note">Payment sent. We&apos;re confirming it on the blockchain and will email you as soon as it clears.</p>;
  return (
    <div className="xpr-pay">
      <button type="button" className="btn btn-primary" onClick={pay} disabled={state.kind === "working"}>
        {state.kind === "working" ? "Waiting for your wallet…" : <>Pay {quantity} with WebAuth <span aria-hidden>↗</span></>}
      </button>
      <p className="form-help">XMD (Metal Dollar) is pegged 1:1 to the US dollar. Your WebAuth wallet will ask you to approve the payment to <strong>{account}</strong> with memo <strong>{orderId}</strong>.</p>
      {state.kind === "error" && <p className="form-error">{state.message}</p>}
    </div>
  );
}
