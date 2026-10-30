"use client";

import { Ledger } from "../../components/Ledger";
import { useStore } from "../store";

export default function ReceiptsPage() {
  const { receipts, mandate } = useStore();
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
