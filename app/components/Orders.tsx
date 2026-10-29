"use client";

import { day, usd } from "./api";

export type DisputeView = {
  status: "draft" | "awaiting_buyer_filing" | "filed" | "open" | "resolved";
  statement: string;
  writer: "model" | "template";
  evidenceDigest: string;
  evidence: { receipts?: unknown[] } | null;
  paypalDisputeId: string | null;
  fileUrl: string | null;
};

export type OrderView = {
  id: string;
  merchantId: string;
  items: Array<{ title: string; qty: number }>;
  amountMinor: number;
  carrier: string;
  trackingNumber: string;
  expectedBy: string;
  shipmentStatus: "LABEL_CREATED" | "IN_TRANSIT" | "DELIVERED" | "LOST";
  paypalTracking: "attached" | "failed" | "not_applicable";
  problem: "not_received" | null;
  dispute: DisputeView | null;
};

const STATUS: Record<OrderView["shipmentStatus"], [string, string]> = {
  LABEL_CREATED: ["b-info", "Label created"],
  IN_TRANSIT: ["b-info", "In transit"],
  DELIVERED: ["b-allow", "Delivered"],
  LOST: ["b-block", "Lost by carrier"],
};

type Act = (orderId: string, kind: "lost" | "delivered" | "draft" | "file" | "sync") => void;

export function Orders({ orders, busy, act, onCheck }: { orders: OrderView[]; busy: boolean; act: Act; onCheck: () => void }) {
  return (
    <>
      <div className="row" style={{ marginTop: 0 }}>
        <button onClick={onCheck} disabled={busy || orders.length === 0}>
          Check deliveries
        </button>
        <span className="small">Parcels are handled by a simulated carrier; the demo buttons change their state.</span>
      </div>
      {orders.length === 0 && <p className="small">No orders yet. Paid purchases appear here with tracking.</p>}
      <ul className="feed">
        {orders.map((o) => {
          const [cls, label] = STATUS[o.shipmentStatus];
          const d = o.dispute;
          return (
            <li key={o.id} data-testid={`order-${o.id}`}>
              <div className="orderhead">
                <strong>{o.items.map((i) => (i.qty > 1 ? `${i.qty} × ${i.title}` : i.title)).join(", ")}</strong>
                <span>{usd(o.amountMinor)}</span>
              </div>
              <div className="small">
                PayPal order <code>{o.id}</code> · {o.carrier} <code>{o.trackingNumber}</code> · expected {day(o.expectedBy)}
                {o.paypalTracking === "attached" && " · tracking added to PayPal"} ·{" "}
                <a href={`/seller?merchant=${encodeURIComponent(o.merchantId)}&order=${encodeURIComponent(o.id)}`}>check as the seller →</a>
              </div>
              <div className="row">
                <span className={`badge ${cls}`}>{label}</span>
                {o.problem === "not_received" && <span className="badge b-block">Not received</span>}
                {o.shipmentStatus !== "DELIVERED" && o.shipmentStatus !== "LOST" && (
                  <>
                    <button onClick={() => act(o.id, "lost")} disabled={busy}>
                      Simulate lost parcel
                    </button>
                    <button onClick={() => act(o.id, "delivered")} disabled={busy}>
                      Mark delivered
                    </button>
                  </>
                )}
              </div>

              {o.problem === "not_received" && !d && (
                <div className="row">
                  <button className="primary" onClick={() => act(o.id, "draft")} disabled={busy}>
                    Draft dispute
                  </button>
                </div>
              )}

              {d && (
                <div className="dispute" data-testid="dispute">
                  <div className="small">
                    Dispute: <strong>{d.status.replace(/_/g, " ")}</strong>
                    {d.paypalDisputeId && (
                      <>
                        {" "}
                        · PayPal id <code>{d.paypalDisputeId}</code>
                      </>
                    )}
                    {d.writer === "template" && " · statement from template"}
                  </div>
                  {d.statement && <blockquote>{d.statement}</blockquote>}
                  {d.evidence && (
                    <div className="small">
                      Evidence: {d.evidence.receipts?.length ?? 0} signed receipts and tracking history · digest <code>{d.evidenceDigest.slice(0, 16)}…</code>
                    </div>
                  )}
                  <div className="row">
                    {d.status === "draft" && (
                      <>
                        <button className="primary" onClick={() => act(o.id, "file")} disabled={busy}>
                          Confirm and file dispute
                        </button>
                        <button onClick={() => act(o.id, "draft")} disabled={busy}>
                          Redraft
                        </button>
                      </>
                    )}
                    {d.status === "awaiting_buyer_filing" && d.fileUrl && (
                      <>
                        <a href={d.fileUrl} target="_blank" rel="noreferrer">
                          File in PayPal Resolution Center →
                        </a>
                        <button onClick={() => act(o.id, "sync")} disabled={busy}>
                          Check PayPal for the dispute
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
