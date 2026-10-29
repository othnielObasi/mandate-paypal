"use client";

import { useCallback, useEffect, useState } from "react";
import type { Policy } from "@/lib/gate/policy";
import type { Receipt } from "@/lib/gate/receipts";
import { api, usd } from "./components/api";
import { Connections } from "./components/Connections";
import { Ledger } from "./components/Ledger";
import { Orders, type OrderView } from "./components/Orders";
import { RulesEditor } from "./components/RulesEditor";

type Mandate = { id: string; status: "active" | "paused" | "revoked"; policy: Policy; rawText: string };
type Budget = { mandate: Mandate; spentMinor: number; reservedMinor: number; remainingMinor: number };
type Decision = { outcome: "allow" | "approve" | "block"; rule: string; reason: string };
type ProposeResult = { status: string; decision?: Decision; approveUrl?: string; error?: string };
type AgentEvent = { kind: "text"; text: string } | { kind: "tool"; name: string; input: Record<string, unknown>; ok: boolean; result: unknown };
type Approval = { id: string; summary: string; decision: Decision; expiresAt: string };
type Health = { provider: string; model: string; signingKey: string };

function Outcome({ r }: { r: ProposeResult }) {
  const map: Record<string, [string, string]> = {
    paid: ["b-allow", "Paid"],
    awaiting_buyer: ["b-ask", "Approve in PayPal"],
    pending_approval: ["b-ask", "Needs your approval"],
    blocked: ["b-block", "Blocked"],
    failed: ["b-block", "Failed"],
    declined: ["b-info", "Declined"],
  };
  const [cls, label] = map[r.status] ?? ["b-info", r.status];
  return (
    <>
      <span className={`badge ${cls}`}>{label}</span>
      {r.decision && <span className="small">{r.decision.reason}</span>}
      {r.error && <span className="small"> {r.error}</span>}
      {r.approveUrl && (
        <div className="row">
          <a href={r.approveUrl}>Open PayPal to approve this payment →</a>
        </div>
      )}
    </>
  );
}

function summarise(e: Extract<AgentEvent, { kind: "tool" }>): string {
  const r = e.result as Record<string, unknown>;
  if (e.name === "search_catalog") {
    const items = (r.results as Array<{ title: string; price: string }>) ?? [];
    return items.length ? items.map((i) => `${i.title} ${i.price}`).join(" · ") : "No matches";
  }
  if (e.name === "get_product") return `Read the product page for ${String(r.title)} (untrusted merchant content)`;
  return "";
}

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [text, setText] = useState("Household basics, up to $80 a month, nothing over $25, verified sellers only");
  const [draft, setDraft] = useState<Policy | null>(null);
  const [budget, setBudget] = useState<Budget | null>(null);
  const [task, setTask] = useState("Buy washing-up liquid and sponges");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mandate = budget?.mandate ?? null;

  const refresh = useCallback(
    async (id?: string) => {
      const mid = id ?? mandate?.id;
      const all = await api<Receipt[]>("/api/receipts");
      setReceipts(all);
      if (!mid) return;
      const [b, a, o] = await Promise.all([
        api<Budget>(`/api/mandates/${mid}`),
        api<Approval[]>(`/api/approvals?mandateId=${mid}`),
        api<OrderView[]>(`/api/orders?mandateId=${mid}`),
      ]);
      setBudget(b);
      setApprovals(a);
      setOrders(o);
    },
    [mandate?.id],
  );

  useEffect(() => {
    api<Health>("/api/health").then(setHealth).catch(() => undefined);
    api<Mandate[]>("/api/mandates")
      .then((ms) => refresh(ms.at(-1)?.id))
      .catch(() => undefined);
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p) setNotice(p === "paid" ? "Payment captured in the PayPal sandbox." : `PayPal return: ${p.replace(/_/g, " ")}`);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const readRules = () =>
    act(async () => {
      const r = await api<{ policy: Policy }>("/api/mandates/preview", { method: "POST", body: JSON.stringify({ text }) });
      setDraft(r.policy);
    });

  const saveRules = (policy: Policy) =>
    act(async () => {
      const m = await api<Mandate>("/api/mandates", { method: "POST", body: JSON.stringify({ text, policy }) });
      setDraft(null);
      setEvents([]);
      await refresh(m.id);
    });

  const setStatus = (status: Mandate["status"]) =>
    act(async () => {
      await api(`/api/mandates/${mandate!.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await refresh();
    });

  const runAgent = (drill: boolean) =>
    act(async () => {
      setEvents([]);
      const r = await api<{ events: AgentEvent[] }>("/api/agent/run", {
        method: "POST",
        body: JSON.stringify({ mandateId: mandate!.id, task: drill ? "Buy a cleaning spray" : task, drill }),
      });
      setEvents(r.events);
      await refresh();
    });

  const decide = (id: string, choice: "approve" | "decline") =>
    act(async () => {
      const r = await api<ProposeResult>(`/api/approvals/${id}`, { method: "POST", body: JSON.stringify({ choice }) });
      setEvents((ev) => [...ev, { kind: "tool", name: "your_decision", input: { choice }, ok: true, result: r }]);
      await refresh();
    });

  const orderAct = (orderId: string, kind: "lost" | "delivered" | "draft" | "file" | "sync") =>
    act(async () => {
      if (kind === "lost" || kind === "delivered") {
        await api(`/api/orders/${orderId}/simulate`, { method: "POST", body: JSON.stringify({ event: kind }) });
      } else if (kind === "file") {
        // The "Confirm and file dispute" button is the user's explicit confirmation.
        await api(`/api/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify({ action: "file", confirm: true }) });
      } else {
        await api(`/api/orders/${orderId}/dispute`, { method: "POST", body: JSON.stringify({ action: kind }) });
      }
      await refresh();
    });

  const checkDeliveries = () =>
    act(async () => {
      await api("/api/orders/check", { method: "POST", body: JSON.stringify({ mandateId: mandate!.id }) });
      await refresh();
    });

  const p = mandate?.policy;
  const pct = (n: number) => (p ? Math.min(100, (n / p.budget.amountMinor) * 100) : 0);

  return (
    <main>
      <header className="top">
        <h1>
          Mandate<span>let an AI spend, within your rules</span>
        </h1>
        {health && (
          <div className="pills">
            <span className="pill">payments: {health.provider === "simulated" ? "simulated (no PayPal keys)" : "PayPal sandbox · Agent Toolkit"}</span>
            <span className="pill">agent: {health.model}</span>
            <span className="pill">signing key: {health.signingKey}</span>
          </div>
        )}
      </header>

      {notice && <div className="notice">{notice}</div>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="grid">
        <section className="panel">
          <h2>1 · Your mandate</h2>
          {draft ? (
            <RulesEditor initial={draft} busy={busy} onSave={saveRules} onCancel={() => setDraft(null)} />
          ) : (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Mandate in plain English" />
              <div className="row">
                <button className="primary" onClick={readRules} disabled={busy}>
                  {mandate ? "Read new rules" : "Read my rules"}
                </button>
              </div>
            </>
          )}
          {p && mandate && budget && !draft && (
            <>
              <dl className="rules" data-testid="rules">
                <dt>Status</dt>
                <dd>{mandate.status}</dd>
                <dt>Categories</dt>
                <dd>{p.categories.join(", ")}</dd>
                <dt>Per item</dt>
                <dd>
                  up to {usd(p.maxItemMinor)} ({p.overLimit === "ask" ? "ask me above that" : "refuse above that"})
                </dd>
                <dt>Budget</dt>
                <dd>
                  {usd(p.budget.amountMinor)} per {p.budget.period}
                </dd>
                <dt>Sellers</dt>
                <dd>{p.sellers.verifiedOnly ? "verified only" : "any"}</dd>
                <dt>Expires</dt>
                <dd>{p.expires}</dd>
              </dl>
              <div className="meter" aria-label="Budget used">
                <i className="spent" style={{ width: `${pct(budget.spentMinor)}%` }} />
                <i className="held" style={{ width: `${pct(budget.reservedMinor)}%` }} />
              </div>
              <p className="small" data-testid="budget">
                {usd(budget.spentMinor)} spent · {usd(budget.reservedMinor)} held · {usd(budget.remainingMinor)} left this {p.budget.period}
              </p>
              <div className="row">
                {mandate.status === "active" && (
                  <button onClick={() => setStatus("paused")} disabled={busy}>
                    Pause
                  </button>
                )}
                {mandate.status === "paused" && (
                  <button onClick={() => setStatus("active")} disabled={busy}>
                    Resume
                  </button>
                )}
                {mandate.status !== "revoked" && (
                  <button className="danger" onClick={() => setStatus("revoked")} disabled={busy}>
                    Revoke
                  </button>
                )}
              </div>
            </>
          )}
        </section>

        <section className="panel">
          <h2>2 · Agent</h2>
          <input type="text" value={task} onChange={(e) => setTask(e.target.value)} aria-label="Task for the agent" disabled={!mandate} />
          <div className="row">
            <button className="primary" onClick={() => runAgent(false)} disabled={busy || !mandate}>
              Run agent
            </button>
            <button onClick={() => runAgent(true)} disabled={busy || !mandate} title="A compromised agent that obeys product pages">
              Compromised-agent drill
            </button>
          </div>
          <p className="small">Try “Buy an electric kettle” (over the item limit) or “Buy toilet roll” (unverified seller).</p>
          {approvals.map((a) => (
            <div className="approval" key={a.id} data-testid="approval">
              <strong>Approve {a.summary}?</strong>
              <div className="small">{a.decision.reason}</div>
              <div className="row">
                <button className="primary" onClick={() => decide(a.id, "approve")} disabled={busy}>
                  Approve
                </button>
                <button onClick={() => decide(a.id, "decline")} disabled={busy}>
                  Decline
                </button>
              </div>
            </div>
          ))}
          {mandate && mandate.status !== "revoked" && <Connections mandateId={mandate.id} onChange={() => void refresh()} />}
          <ul className="feed" data-testid="feed">
            {events.map((e, i) =>
              e.kind === "text" ? (
                <li key={i}>{e.text}</li>
              ) : (
                <li key={i}>
                  <code>
                    {e.name}({Object.entries(e.input).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(", ")})
                  </code>
                  <div>
                    {e.name === "propose_purchase" || e.name === "your_decision" ? (
                      e.ok ? (
                        <Outcome r={e.result as ProposeResult} />
                      ) : (
                        <span className="badge b-block">{String(e.result)}</span>
                      )
                    ) : (
                      <span className="small">{e.ok ? summarise(e) : String(e.result)}</span>
                    )}
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>

        <section className="panel span2">
          <h2>3 · Orders and deliveries</h2>
          <Orders orders={orders} busy={busy} act={orderAct} onCheck={checkDeliveries} />
        </section>

        <section className="panel span2">
          <h2>4 · Receipts ledger</h2>
          <Ledger receipts={receipts} mandateId={mandate?.id ?? null} />
        </section>
      </div>
    </main>
  );
}
