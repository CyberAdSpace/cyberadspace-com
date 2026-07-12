"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LinkSession, ProtonWebLink, Link } from "@proton/web-sdk";

// XPR Network (Proton) mainnet
const ENDPOINTS = ["https://proton.greymass.com", "https://proton.eoscafeblock.com"];
const CHAIN_ID = "384da888112027f0321850a169f737c33e53b388aad48b5adace4bab97f437e0";
const REQUEST_ACCOUNT = "cyberadspace"; // on-chain account, also the app identifier
// CAS token contract — update once the token contract is deployed
const CAS_CONTRACT = "cyberadspace";
const CAS_SYMBOL = "CAS";

type WalletState = {
  actor: string;
  permission: string;
};

export default function WebAuthConnect() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const linkRef = useRef<ProtonWebLink | Link | null>(null);
  const sessionRef = useRef<LinkSession | null>(null);

  const fetchBalance = useCallback(async (actor: string) => {
    try {
      const res = await fetch(`${ENDPOINTS[0]}/v1/chain/get_currency_balance`, {
        method: "POST",
        body: JSON.stringify({ code: CAS_CONTRACT, account: actor, symbol: CAS_SYMBOL }),
      });
      const rows = (await res.json()) as string[];
      setBalance(Array.isArray(rows) && rows.length > 0 ? rows[0] : null);
    } catch {
      setBalance(null);
    }
  }, []);

  const connect = useCallback(
    async (restoreOnly: boolean) => {
      setBusy(true);
      setError(null);
      try {
        const { default: ProtonWebSDK } = await import("@proton/web-sdk");
        const { link, session } = await ProtonWebSDK({
          linkOptions: {
            endpoints: ENDPOINTS,
            chainId: CHAIN_ID,
            restoreSession: restoreOnly,
          },
          transportOptions: {
            requestAccount: REQUEST_ACCOUNT,
          },
        });
        linkRef.current = link ?? null;
        if (session) {
          sessionRef.current = session;
          const actor = String(session.auth.actor);
          setWallet({ actor, permission: String(session.auth.permission) });
          void fetchBalance(actor);
        }
      } catch (e) {
        if (!restoreOnly) {
          setError(e instanceof Error ? e.message : "Could not connect wallet.");
        }
      } finally {
        setBusy(false);
      }
    },
    [fetchBalance],
  );

  // Restore a previous session silently on load
  useEffect(() => {
    void connect(true);
  }, [connect]);

  const disconnect = useCallback(async () => {
    try {
      if (linkRef.current && sessionRef.current) {
        await linkRef.current.removeSession(
          REQUEST_ACCOUNT,
          sessionRef.current.auth,
          CHAIN_ID,
        );
      }
    } catch {
      // best effort
    }
    sessionRef.current = null;
    setWallet(null);
    setBalance(null);
  }, []);

  if (wallet) {
    return (
      <div className="webauth-box">
        <div className="webauth-row">
          <span className="webauth-dot" aria-hidden />
          <span className="webauth-actor">@{wallet.actor}</span>
          <span className="webauth-net">XPR NETWORK</span>
        </div>
        <div className="webauth-balance">
          {balance ? (
            <>CAS BALANCE · {balance}</>
          ) : (
            <>CAS TOKEN · WALLET LINKED — BALANCES GO LIVE AT TOKEN LAUNCH</>
          )}
        </div>
        <button type="button" className="webauth-disconnect" onClick={disconnect}>
          DISCONNECT
        </button>
      </div>
    );
  }

  return (
    <div className="webauth-box">
      <button
        type="button"
        className="webauth-connect"
        onClick={() => void connect(false)}
        disabled={busy}
      >
        {busy ? "OPENING WEBAUTH…" : "CONNECT WEBAUTH WALLET →"}
      </button>
      {error ? <div className="webauth-error">{error}</div> : null}
    </div>
  );
}
