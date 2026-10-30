"use client";

import { useEffect, useState } from "react";
import { api, merchantName, usd } from "../../components/api";
import { Ledger } from "../../components/Ledger";
import { useStore } from "../store";

export default function ReceiptsPage() {
  const { receipts, mandate, orders } = useStore();
  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Receipts</h1>
          <p className="page-sub">Every decision Mandate makes is signed and linked to the one before it. Nobody, including us, can quietly change the record.</p>
        </div>
      </section>
      <div className="split">
        <Ledger receipts={receipts} mandateId={mandate?.id ?? null} />
        <aside className="col">
          <section className="card card-night">
            <h2 style={{ fontSize: 16 }}>Verify anywhere</h2>
            <p className="small mt-8">Download the log and check it with the public keys. No account needed.</p>
            <pre className="code mt-12">{`GET  /api/trust
→ Ed25519 public keys

GET  /api/receipts
→ the signed log

POST /api/receipts/verify
→ { ok: true, count: ${receipts.length} }`}</pre>
            <div className="row mt-16">
              <a className="btn btn-sm" href="/api/receipts" download="mandate-receipts.json">
                Download the log
              </a>
              <a className="btn btn-sm btn-ghost" href="/api/trust" target="_blank" rel="noreferrer" style={{ color: "var(--night-accent)" }}>
                Public keys
              </a>
            </div>
          </section>
          <Ap2Receipts orders={orders.map((o) => ({ id: o.id, merchantId: o.merchantId, amountMinor: o.amountMinor }))} />
          <section className="card">
            <h2 className="section-label" style={{ marginBottom: 8 }}>
              Try to cheat
            </h2>
            <p className="small">Double-click any &ldquo;What happened&rdquo; cell, change it, then press Verify chain. The ledger names the exact row you altered.</p>
          </section>
        </aside>
      </div>
    </>
  );
}

type Ap2Verdict = { ok: boolean; mode: "human_present" | "human_not_present"; evidence: { paymentReceipt?: string } };

/** One AP2 v0.2 evidence pack per paid order: mandates, signed checkout and both receipts. */
function Ap2Receipts({ orders }: { orders: Array<{ id: string; merchantId: string; amountMinor: number }> }) {
  const [v, setV] = useState<Record<string, Ap2Verdict | "none">>({});
  const key = orders.map((o) => o.id).join(",");
  useEffect(() => {
    let live = true;
    for (const id of key ? key.split(",") : [])
      api<Ap2Verdict>(`/api/ap2/orders/${encodeURIComponent(id)}`)
        .then((r) => live && setV((m) => ({ ...m, [id]: r })))
        .catch(() => live && setV((m) => ({ ...m, [id]: "none" })));
    return () => {
      live = false;
    };
  }, [key]);
  if (orders.length === 0) return null;
  return (
    <section className="card" aria-labelledby="ap2r-h" data-testid="ap2-receipts">
      <h2 id="ap2r-h" className="section-label" style={{ marginBottom: 6 }}>
        AP2 v0.2 receipts
      </h2>
      <p className="small" style={{ marginBottom: 10 }}>
        Each payment carries its mandates and the merchant&rsquo;s and payment gateway&rsquo;s signed receipts.
      </p>
      <ul className="ap2r">
        {orders.map((o) => {
          const r = v[o.id];
          return (
            <li key={o.id}>
              <span className="grow" style={{ minWidth: 0 }}>
                <strong>{usd(o.amountMinor)}</strong> <span className="small">to {merchantName(o.merchantId)}</span>
                <span className="tiny mono" style={{ display: "block" }}>
                  {o.id}
                </span>
              </span>
              {r === undefined ? (
                <span className="tiny">Checking…</span>
              ) : r === "none" ? (
                <span className="chip chip-outline">Not issued</span>
              ) : (
                <span className={`chip ${r.ok ? "chip-allow" : "chip-block"}`}>{r.ok ? "Verified" : "Failed"}</span>
              )}
              {r && r !== "none" && (
                <a className="small" href={`/api/ap2/orders/${encodeURIComponent(o.id)}`} download={`ap2-evidence-${o.id}.json`} aria-label={`Download AP2 evidence for ${o.id}`}>
                  Download
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
