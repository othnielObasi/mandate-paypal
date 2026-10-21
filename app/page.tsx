"use client";

import { useCallback, useEffect, useState } from "react";

type Policy = {
  categories: string[];
  currency: string;
  maxItemMinor: number;
  budget: { amountMinor: number; period: string };
  sellers: { verifiedOnly: boolean; blocked: string[] };
  overLimit: "ask" | "block";
  expires: string;
};
type Mandate = { id: string; status: "active" | "paused" | "revoked"; policy: Policy; rawText: string };
type Budget = { mandate: Mandate; spentMinor: number; reservedMinor: number; remainingMinor: number };
type Decision = { outcome: "allow" | "approve" | "block"; rule: string; reason: string };
type ProposeResult = { status: string; decision?: Decision; approveUrl?: string; error?: string; approvalId?: string };
type AgentEvent = { kind: "text"; text: string } | { kind: "tool"; name: string; input: Record<string, unknown>; ok: boolean; result: unknown };
type Approval = { id: string; summary: string; decision: Decision; expiresAt: string };
type Receipt = { seq: number; mandateId: string; type: string; summary: string; createdAt: string; hash: string; [k: string]: unknown };
type Health = { provider: string; model: string; signingKey: string };
type Verify = { ok: true; count: number } | { ok: false; brokenAt: number; reason: string };

const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

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

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [text, setText] = useState("Household basics, up to $80 a month, nothing over $25, verified sellers only");
  const [budget, setBudget] = useState<Budget | null>(null);
  const [task, setTask] = useState("Buy washing-up liquid and sponges");
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [verify, setVerify] = useState<Verify | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const mandate = budget?.mandate ?? null;

  const refresh = useCallback(async (id?: string) => {
    const mid = id ?? mandate?.id;
    if (!mid) return;
    const [b, a, r] = await Promise.all([
      api<Budget>(`/api/mandates/${mid}`),
      api<Approval[]>(`/api/approvals?mandateId=${mid}`),
      api<Receipt[]>(`/api/receipts?mandateId=${mid}`),
    ]);
    setBudget(b);
    setApprovals(a);
    setReceipts(r);
  }, [mandate?.id]);

  useEffect(() => {
    api<Health>("/api/health").then(setHealth).catch(() => undefined);
    api<Mandate[]>("/api/mandates")
      .then((ms) => {
        const last = ms.at(-1);
        if (last) void refresh(last.id);
      })
      .catch(() => undefined);
    const p = new URLSearchParams(window.location.search).get("payment");
    if (p) setNotice(p === "paid" ? "Payment captured in PayPal sandbox." : `PayPal return: ${p}`);
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

  const createMandate = () =>
    act(async () => {
      const m = await api<Mandate>("/api/mandates", { method: "POST", body: JSON.stringify({ text }) });
      setEvents([]);
      setVerify(null);
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

  const verifyChain = (tamper: boolean) =>
    act(async () => {
      const all = await api<Receipt[]>("/api/receipts");
      const payment = [...all].reverse().find((r) => r.type === "payment");
      const copy = tamper && payment ? all.map((r) => (r.seq === payment.seq ? { ...r, summary: r.summary.replace(/\$[\d.]+/, "$0.01") } : r)) : all;
      setVerify(await api<Verify>("/api/receipts/verify", { method: "POST", body: JSON.stringify({ receipts: copy }) }));
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
      {error && <p className="error">{error}</p>}

      <div className="grid">
        <section className="panel">
          <h2>1 · Your mandate</h2>
          <textarea value={text} onChange={(e) => setText(e.target.value)} aria-label="Mandate in plain English" />
          <div className="row">
            <button className="primary" onClick={createMandate} disabled={busy}>
              {mandate ? "Replace mandate" : "Create mandate"}
            </button>
          </div>
          {p && mandate && budget && (
            <>
              <dl className="rules">
                <dt>Status</dt>
                <dd>{mandate.status}</dd>
                <dt>Categories</dt>
                <dd>{p.categories.join(", ")}</dd>
                <dt>Per item</dt>
                <dd>up to {usd(p.maxItemMinor)} ({p.overLimit === "ask" ? "ask me above that" : "refuse above that"})</dd>
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
              <p className="small">
                {usd(budget.spentMinor)} spent · {usd(budget.reservedMinor)} held · {usd(budget.remainingMinor)} left this {p.budget.period}
              </p>
              <div className="row">
                {mandate.status === "active" && <button onClick={() => setStatus("paused")} disabled={busy}>Pause</button>}
                {mandate.status === "paused" && <button onClick={() => setStatus("active")} disabled={busy}>Resume</button>}
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
          <p className="small">Try “Buy an electric kettle” (over the item cap) or “Buy toilet roll” (unverified seller).</p>
          {approvals.map((a) => (
            <div className="approval" key={a.id}>
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
          <ul className="feed">
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
                      e.ok ? <Outcome r={e.result as ProposeResult} /> : <span className="badge b-block">{String(e.result)}</span>
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
          <h2>3 · Receipts</h2>
          <div className="row" style={{ marginTop: 0, marginBottom: 10 }}>
            <button onClick={() => verifyChain(false)} disabled={busy || receipts.length === 0}>
              Verify chain
            </button>
            <button onClick={() => verifyChain(true)} disabled={busy || !receipts.some((r) => r.type === "payment")}>
              Tamper test: edit a payment, then verify
            </button>
            {verify &&
              (verify.ok ? (
                <span className="verdict ok">✓ {verify.count} receipts verified (Ed25519, hash-chained)</span>
              ) : (
                <span className="verdict bad">
                  ✗ Broken at receipt #{verify.brokenAt} ({verify.reason.replace(/_/g, " ")})
                </span>
              ))}
          </div>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Time</th>
                  <th>Type</th>
                  <th>What happened</th>
                  <th>Hash</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((r) => (
                  <tr key={r.seq} className={verify && !verify.ok && verify.brokenAt === r.seq ? "broken" : ""}>
                    <td>{r.seq}</td>
                    <td className="mono">{new Date(r.createdAt).toLocaleTimeString()}</td>
                    <td>{r.type.replace(/_/g, " ")}</td>
                    <td>{r.summary}</td>
                    <td className="mono">{r.hash.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function summarise(e: Extract<AgentEvent, { kind: "tool" }>): string {
  const r = e.result as Record<string, unknown>;
  if (e.name === "search_catalog") {
    const items = (r.results as Array<{ title: string; price: string }>) ?? [];
    return items.length ? items.map((i) => `${i.title} ${i.price}`).join(" · ") : "No matches";
  }
  if (e.name === "get_product") return `Read product page for ${String(r.title)} (untrusted content)`;
  return "";
}
