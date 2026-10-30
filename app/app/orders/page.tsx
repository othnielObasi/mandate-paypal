"use client";

import { useState } from "react";
import NextLink from "next/link";
import { api, day, merchantName, usd } from "../../components/api";
import { Box, Doc, Shield, Truck } from "../../components/icons";
import type { OrderView } from "../../components/Orders";
import { useStore } from "../store";

type Kind = "lost" | "delivered" | "draft" | "file" | "sync";
type Run = (orderId: string, kind: Kind) => Promise<unknown>;

export default function OrdersPage() {
  const { orders, mandate, act, refresh, busy, ready, toast } = useStore();

  const save = (orderId: string, statement: string) =>
    act(async () => {
      await api(`/api/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify({ action: "edit", statement }) });
      await refresh();
      toast("Statement saved in your words.");
      return true;
    });

  const run: Run = (orderId, kind) =>
    act(async () => {
      if (kind === "lost" || kind === "delivered") {
        await api(`/api/orders/${orderId}/simulate`, { method: "POST", body: JSON.stringify({ event: kind }) });
      } else if (kind === "file") {
        // This button is the user's explicit confirmation to file.
        await api(`/api/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify({ action: "file", confirm: true }) });
        toast("Filed with PayPal. You'll see PayPal's reply here.");
      } else {
        await api(`/api/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify({ action: kind }) });
      }
      await refresh();
    });

  const check = () =>
    act(async () => {
      await api("/api/orders/check", { method: "POST", body: JSON.stringify({ mandateId: mandate!.id }) });
      await refresh();
      toast("Checked every parcel with the carrier.");
    });

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-sub">Mandate follows every parcel to your door, and steps in when one doesn&rsquo;t arrive.</p>
        </div>
        <button className="btn" onClick={check} disabled={busy || orders.length === 0}>
          <Truck size={16} /> Check deliveries
        </button>
      </section>

      {ready && orders.length === 0 && (
        <section className="card card-lg empty">
          <span className="icon-tile icon-tile-plain">
            <Box size={26} />
          </span>
          <h2>No orders yet</h2>
          <p>Paid purchases appear here with tracking. If a parcel goes missing, Mandate drafts the PayPal claim for you.</p>
          <NextLink href="/app" className="btn btn-primary">
            Give your agent a job
          </NextLink>
        </section>
      )}

      <div className="stack" style={{ gap: 20 }}>
        {orders.map((o) => (
          <OrderCard key={o.id} o={o} busy={busy} run={run} save={save} />
        ))}
      </div>
    </>
  );
}

const STEPS = ["Paid", "Shipped", "In transit", "Delivered"] as const;

function OrderCard({ o, busy, run, save }: { o: OrderView; busy: boolean; run: Run; save: (id: string, s: string) => Promise<boolean | undefined> }) {
  const d = o.dispute;
  const [editing, setEditing] = useState<string | null>(null);
  const title = o.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(", ");
  const reached = o.shipmentStatus === "DELIVERED" ? 4 : o.shipmentStatus === "IN_TRANSIT" || o.shipmentStatus === "LOST" ? 3 : 2;
  const chip = o.problem
    ? d?.status === "filed" || d?.status === "open"
      ? ["ask", "Dispute open"]
      : d?.status === "resolved"
        ? ["outline", "Dispute resolved"]
        : ["block", "Not received"]
    : o.shipmentStatus === "DELIVERED"
      ? ["allow", "Delivered"]
      : ["accent", o.shipmentStatus === "LABEL_CREATED" ? "Label created" : "On its way"];

  return (
    <article className="card card-flush" aria-labelledby={`o-${o.id}`} data-testid={`order-${o.id}`}>
      <div style={{ padding: "20px 22px" }} className="row between">
        <div style={{ minWidth: 0 }}>
          <h2 id={`o-${o.id}`} style={{ fontSize: 20 }}>
            {title}
          </h2>
          <p className="small" style={{ marginTop: 4 }}>
            {merchantName(o.merchantId)} · PayPal order <span className="mono" style={{ fontSize: 13 }}>{o.id}</span>
            {o.paidAt ? ` · paid ${day(o.paidAt)}` : ""}
          </p>
        </div>
        <div className="row">
          <span className={`chip chip-${chip[0]}`}>{chip[1]}</span>
          <strong style={{ fontSize: 20 }}>{usd(o.amountMinor)}</strong>
        </div>
      </div>

      <div style={{ padding: "0 22px 20px" }}>
        <ol className="track" aria-label="Tracking">
          {STEPS.map((s, i) => {
            const lost = o.shipmentStatus === "LOST" && i === 3;
            const done = i < reached;
            return (
              <li key={s} className={lost ? "bad" : done ? "done" : undefined}>
                <strong>{lost ? "Lost by carrier" : s}</strong>
                {i === 0 && "Signed payment"}
                {i === 1 && (o.paypalTracking === "attached" ? "Tracking added to PayPal" : o.carrier)}
                {i === 2 && `Expected ${day(o.expectedBy)}`}
                {i === 3 && (lost ? "Parcel won't arrive" : done ? "At your door" : "Not yet")}
              </li>
            );
          })}
        </ol>
        <div className="row mt-16 between">
          <span className="small">
            {o.carrier} · tracking <span className="mono">{o.trackingNumber}</span>
          </span>
          <NextLink href={`/seller?merchant=${encodeURIComponent(o.merchantId)}&order=${encodeURIComponent(o.id)}`} className="small">
            Check as the seller
          </NextLink>
        </div>
        {o.shipmentStatus !== "DELIVERED" && o.shipmentStatus !== "LOST" && (
          <div className="demo-ctl mt-12">
            <span>Demo carrier:</span>
            <button className="btn btn-sm" onClick={() => run(o.id, "lost")} disabled={busy}>
              Simulate lost parcel
            </button>
            <button className="btn btn-sm" onClick={() => run(o.id, "delivered")} disabled={busy}>
              Mark delivered
            </button>
          </div>
        )}
      </div>

      {o.problem === "not_received" && !d && (
        <section className="order-foot row between">
          <span>
            <strong>This parcel isn&rsquo;t coming.</strong> <span className="muted">Mandate can write the PayPal claim from the facts and your signed receipts.</span>
          </span>
          <button className="btn btn-primary" onClick={() => run(o.id, "draft")} disabled={busy}>
            Draft dispute
          </button>
        </section>
      )}

      {d && (
        <section className="order-foot" data-testid="dispute" aria-labelledby={`d-${o.id}`}>
          <div className="split" style={{ gap: 24 }}>
            <div className="stack" style={{ gap: 12, minWidth: 0 }}>
              <div>
                <h3 id={`d-${o.id}`} style={{ fontSize: 17 }}>
                  {d.status === "draft" ? "Your dispute is drafted" : d.status === "awaiting_buyer_filing" ? "Ready to file in PayPal" : d.status === "resolved" ? "Dispute resolved" : "Dispute filed with PayPal"}
                </h3>
                <p className="small" style={{ marginTop: 4 }}>
                  {d.status === "draft"
                    ? `${d.writer === "user" ? "In your words." : d.writer === "model" ? "Written by the AI from the facts only." : "Written from the facts with a template."} Nothing is sent until you confirm.`
                    : d.paypalDisputeId
                      ? `PayPal case ${d.paypalDisputeId} · status ${d.status.replace(/_/g, " ")}`
                      : `Status: ${d.status.replace(/_/g, " ")}`}
                </p>
              </div>
              {editing !== null ? (
                <div className="field">
                  <label htmlFor={`st-${o.id}`} className="label">
                    Your statement to PayPal
                  </label>
                  <textarea id={`st-${o.id}`} className="textarea" rows={6} value={editing} onChange={(e) => setEditing(e.target.value)} maxLength={2000} />
                  <span className="tiny">{editing.trim().length} / 2,000 characters · keep the order number and amount</span>
                </div>
              ) : (
                d.statement && <blockquote className="quote">{d.statement}</blockquote>
              )}
              <div className="row">
                {d.status === "draft" && editing !== null && (
                  <>
                    <button className="btn btn-primary" onClick={() => save(o.id, editing).then((ok) => ok && setEditing(null))} disabled={busy || editing.trim().length < 20}>
                      Save statement
                    </button>
                    <button className="btn" onClick={() => setEditing(null)} disabled={busy}>
                      Cancel
                    </button>
                  </>
                )}
                {d.status === "draft" && editing === null && (
                  <>
                    <button className="btn btn-primary" onClick={() => run(o.id, "file")} disabled={busy}>
                      Confirm and file with PayPal
                    </button>
                    <button className="btn" onClick={() => setEditing(d.statement)} disabled={busy}>
                      Edit the statement
                    </button>
                    <button className="btn btn-ghost" onClick={() => run(o.id, "draft")} disabled={busy}>
                      Redraft with AI
                    </button>
                  </>
                )}
                {d.status === "awaiting_buyer_filing" && d.fileUrl && (
                  <>
                    <a className="btn btn-primary" href={d.fileUrl} target="_blank" rel="noreferrer">
                      File in PayPal Resolution Center
                    </a>
                    <button className="btn" onClick={() => run(o.id, "sync")} disabled={busy}>
                      Check PayPal for the dispute
                    </button>
                  </>
                )}
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>Evidence attached</h3>
              <ul className="evidence">
                <li>
                  <Shield size={18} />
                  <span>
                    <strong>Your signed mandate chain</strong>
                    <br />
                    <span className="small">Intent, cart and payment mandates</span>
                  </span>
                </li>
                <li>
                  <Doc size={18} />
                  <span>
                    <strong>{d.evidence?.receipts?.length ?? 0} signed receipts</strong>
                    <br />
                    <span className="small mono" style={{ fontSize: 12 }}>
                      digest {d.evidenceDigest.slice(0, 16)}…
                    </span>
                  </span>
                </li>
                <li>
                  <Truck size={18} />
                  <span>
                    <strong>Tracking history</strong>
                    <br />
                    <span className="small">From label to lost</span>
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
