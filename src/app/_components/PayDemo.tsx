"use client";

import { useCallback, useRef, useState } from "react";
import type { LinkSession, ProtonWebLink, Link } from "@proton/web-sdk";

const ENDPOINTS = ["https://proton.greymass.com", "https://proton.eoscafeblock.com"];
const CHAIN_ID = "384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0";
const REQUEST_ACCOUNT = "cyberadspace"; // merchant account receiving demo payments

const PRESETS = [1, 5, 10];

type Phase = "idle" | "connecting" | "ready" | "paying" | "paid" | "error";

export default function PayDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [actor, setActor] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [txId, setTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<ProtonWebLink | Link | null>(null);
  const sessionRef = useRef<LinkSession | null>(null);

  const connect = useCallback(async () => {
    setPhase("connecting");
    setError(null);
    try {
      const { default: ProtonWebSDK } = await import("@proton/web-sdk");
      const { link, session } = await ProtonWebSDK({
        linkOptions: { endpoints: ENDPOINTS, chainId: CHAIN_ID, restoreSession: false },
        transportOptions: { requestAccount: REQUEST_ACCOUNT },
      });
      linkRef.current = link ?? null;
      if (session) {
        sessionRef.current = session;
        setActor(String(session.auth.actor));
        setPhase("ready");
      } else {
        setPhase("idle");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect wallet.");
      setPhase("idle");
    }
  }, []);

  const pay = useCallback(async () => {
    const session = sessionRef.current;
    if (!session) return;
    setPhase("paying");
    setError(null);
    try {
      const quantity = `${amount.toFixed(4)} XPR`;
      const result = await session.transact(
        {
          actions: [
            {
              account: "eosio.token",
              name: "transfer",
              authorization: [session.auth],
              data: {
                from: session.auth.actor,
                to: REQUEST_ACCOUNT,
                quantity,
                memo: "CyberAdSpace Payments — live terminal demo",
              },
            },
          ],
        },
        { broadcast: true },
      );
      const id =
        (result as { processed?: { id?: string } }).processed?.id ??
        String((result as { transaction?: { id?: unknown } }).transaction?.id ?? "");
      setTxId(id || null);
      setPhase("paid");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment was not completed.");
      setPhase("ready");
    }
  }, [amount]);

  return (
    <div className="paydemo">
      <div className="paydemo-head">
        <span className="paydemo-title">LIVE TERMINAL</span>
        <span className="paydemo-net">XPR MAINNET</span>
      </div>

      <div className="paydemo-merchant">
        <span>MERCHANT</span>
        <strong>@{REQUEST_ACCOUNT}</strong>
      </div>

      <div className="paydemo-amounts">
        {PRESETS.map((v) => (
          <button
            key={v}
            type="button"
            className={`paydemo-amount${amount === v ? " on" : ""}`}
            onClick={() => setAmount(v)}
            disabled={phase === "paying" || phase === "connecting"}
          >
            {v} XPR
          </button>
        ))}
      </div>

      {phase === "paid" && txId ? (
        <div className="paydemo-receipt">
          <div className="paydemo-paid">✓ PAYMENT SETTLED ON-CHAIN</div>
          <a
            href={`https://explorer.xprnetwork.org/transaction/${txId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="paydemo-tx"
          >
            VIEW RECEIPT · {txId.slice(0, 12)}…
          </a>
          <button type="button" className="paydemo-again" onClick={() => setPhase("ready")}>
            NEW SALE
          </button>
        </div>
      ) : actor && (phase === "ready" || phase === "paying") ? (
        <button type="button" className="paydemo-pay" onClick={() => void pay()} disabled={phase === "paying"}>
          {phase === "paying" ? "WAITING FOR WALLET…" : `CHARGE ${amount} XPR → @${REQUEST_ACCOUNT}`}
        </button>
      ) : (
        <button
          type="button"
          className="paydemo-pay"
          onClick={() => void connect()}
          disabled={phase === "connecting"}
        >
          {phase === "connecting" ? "OPENING WEBAUTH…" : "CONNECT WALLET TO PAY"}
        </button>
      )}

      {actor ? <div className="paydemo-actor">CUSTOMER · @{actor}</div> : null}
      {error ? <div className="paydemo-error">{error}</div> : null}
      <div className="paydemo-note">
        Real money, tiny amounts — this terminal settles actual XPR to the CyberAdSpace merchant
        account in about a second. That&apos;s the product.
      </div>
    </div>
  );
}
