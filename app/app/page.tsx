"use client";

import { useEffect, useMemo, useState } from "react";
import NextLink from "next/link";
import { STATUS_LABEL, STATUS_TONE, ruleLabel, type Activity } from "@/lib/ui/activity";
import { api, clock, merchantName, usd } from "../components/api";
import { Dialog } from "../components/Dialog";
import { Alert, Bolt, Check, Cross, Key, Pause, Play, Plug, Shield, ShieldX } from "../components/icons";
import { useStore, type AgentEvent, type Approval, type Mandate, type ProposeResult, type Run } from "./store";

const TASKS = ["Buy washing-up liquid and sponges", "Buy an electric kettle", "Buy toilet roll", "Buy black ink"];

export default function HomePage() {
  const { ready, mandate } = useStore();
  if (!ready) return <Skeleton />;
  if (!mandate) return <Welcome />;
  return <Dashboard mandate={mandate} />;
}

function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading your mandate" className="stack" style={{ gap: 20 }}>
      <div className="card" style={{ height: 120, opacity: 0.6 }} />
      <div className="split">
        <div className="card" style={{ height: 320, opacity: 0.6 }} />
        <div className="card" style={{ height: 320, opacity: 0.6 }} />
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <section className="card card-lg empty">
      <span className="icon-tile icon-tile-accent">
        <Shield size={28} />
      </span>
      <h1 style={{ fontSize: 28, marginBottom: 8 }}>Set your rules before any agent spends</h1>
      <p>Write what your agents may buy in one sentence. You&rsquo;ll check the rules and sign them, then any agent you connect has to obey them.</p>
      <NextLink href="/app/setup" className="btn btn-primary btn-lg">
        Write my mandate
      </NextLink>
    </section>
  );
}

function titleOf(m: Mandate) {
  const first = m.rawText.split(/[,.;]/)[0]!.trim();
  return first ? first[0]!.toUpperCase() + first.slice(1) : "Your mandate";
}

function Dashboard({ mandate }: { mandate: Mandate }) {
  const { budget, approvals, activity, act, refresh, toast, busy, decide } = useStore();
  const [openApproval, setOpenApproval] = useState<Approval | null>(null);
  const [openBlocked, setOpenBlocked] = useState<Activity | null>(null);
  const [openProof, setOpenProof] = useState<Activity | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const p = mandate.policy;
  const sig = mandate.intentMandate?.user_authorization?.split(".")[2]?.slice(0, 10);

  const setStatus = (status: Mandate["status"]) =>
    act(async () => {
      await api(`/api/mandates/${mandate.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await refresh();
      toast(status === "paused" ? "All agents paused. Nothing will be bought." : status === "active" ? "Agents resumed." : "Mandate revoked. No agent can spend under it.");
    });

  const rowFor = (a: Approval) => activity.find((x) => x.approvalId === a.id);

  return (
    <>
      <section className="page-head">
        <div>
          <div className="row" style={{ gap: 8, marginBottom: 10 }}>
            <span className={`chip ${mandate.status === "active" ? "chip-allow" : mandate.status === "paused" ? "chip-ask" : "chip-block"}`}>
              <span className="dot" />
              {mandate.status === "active" ? "Active" : mandate.status === "paused" ? "Paused" : "Revoked"}
            </span>
            {sig && (
              <span className="chip chip-outline chip-mono" title="Your Ed25519 signature on the Intent Mandate">
                <Shield size={14} style={{ color: "var(--accent)" }} />
                Signed by you · Intent Mandate · {sig}…
              </span>
            )}
          </div>
          <h1 className="page-title">{titleOf(mandate)}</h1>
          <p className="page-sub">Your agents may buy {p.categories.join(", ")} items for you, within the rules you signed.</p>
        </div>
        <div className="row">
          {mandate.status === "active" && (
            <button className="btn" onClick={() => setStatus("paused")} disabled={busy}>
              <Pause size={16} /> Pause all agents
            </button>
          )}
          {mandate.status === "paused" && (
            <button className="btn" onClick={() => setStatus("active")} disabled={busy}>
              <Play size={16} /> Resume agents
            </button>
          )}
          <NextLink href="/app/setup" className="btn btn-primary">
            Change rules
          </NextLink>
        </div>
      </section>

      {mandate.status === "revoked" && (
        <div className="banner banner-block" style={{ marginBottom: 20 }}>
          <ShieldX size={20} />
          <span className="grow">This mandate is revoked. No agent can spend under it. Write a new one to start again.</span>
          <NextLink href="/app/setup" className="btn btn-sm">
            New mandate
          </NextLink>
        </div>
      )}

      <div className="split">
        <div className="col">
          <div className="only-narrow">
            <BudgetCard compact />
          </div>
          {approvals.map((a) => {
            const row = rowFor(a);
            return (
              <section key={a.id} className="card card-ask" aria-labelledby={`ap-${a.id}`} data-testid="approval">
                <div className="card-head">
                  <h2 id={`ap-${a.id}`} className="section-label" style={{ color: "var(--ask)" }}>
                    Needs you
                  </h2>
                  <Countdown until={a.expiresAt} />
                </div>
                <div className="row" style={{ gap: 16, alignItems: "center" }}>
                  <div className="grow" style={{ minWidth: 240 }}>
                    <p style={{ fontSize: 18, fontWeight: 600 }}>
                      {row?.agent ?? "Your agent"} wants to buy {a.summary}
                    </p>
                    <p className="muted">{a.decision.reason}</p>
                  </div>
                  <div className="row">
                    <button className="btn" onClick={() => decide(a.id, "decline")} disabled={busy}>
                      Decline
                    </button>
                    <button className="btn btn-ghost" onClick={() => setOpenApproval(a)}>
                      Details
                    </button>
                    <button className="btn btn-primary" onClick={() => decide(a.id, "approve")} disabled={busy}>
                      <Key size={16} /> Approve and sign
                    </button>
                  </div>
                </div>
              </section>
            );
          })}

          <TryIt />

          <AgentCard disabled={mandate.status !== "active"} />

          <section className="card" aria-labelledby="activity-h">
            <div className="card-head">
              <h2 id="activity-h" className="card-title">
                What your agents did
              </h2>
              <NextLink href="/app/receipts" className="small">
                All receipts
              </NextLink>
            </div>
            {activity.length === 0 ? (
              <p className="muted">Nothing yet. Give your agent a task above, or connect an assistant.</p>
            ) : (
              <ul className="list" data-testid="activity">
                {activity.slice(0, 8).map((x) => (
                  <li key={x.seq}>
                    <ActivityRow
                      a={x}
                      onOpen={() => {
                        if (x.status === "blocked") setOpenBlocked(x);
                        else if (x.status === "paid" && x.paypalOrderId) setOpenProof(x);
                        else if (x.status === "asked") {
                          const ap = approvals.find((y) => y.id === x.approvalId);
                          if (ap) setOpenApproval(ap);
                        }
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="col">
          <div className="only-wide">{budget && <BudgetCard />}</div>
          <section className="card" aria-labelledby="rules-h">
            <h2 id="rules-h" className="section-label" style={{ marginBottom: 12 }}>
              Your rules
            </h2>
            <ul className="ticks" data-testid="rules">
              <li>
                <Check size={16} className="ok-ico" />
                <span>Only {p.categories.join(", ")} items</span>
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                <span>
                  Up to {usd(p.maxItemMinor)} per order, {p.overLimit === "ask" ? "ask me above that" : "refuse above that"}
                </span>
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                <span>
                  {usd(p.budget.amountMinor)} per {p.budget.period} in total
                </span>
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                <span>{p.maxPremiumPct == null ? "No fair-price rule" : `Never more than ${p.maxPremiumPct}% above market price`}</span>
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                <span>
                  {p.sellers.verifiedOnly ? "Verified sellers only" : "Any seller"}
                  {p.sellers.blocked.length > 0 && `, never ${p.sellers.blocked.join(", ")}`}
                </span>
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                <span>Until {new Date(`${p.expires}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</span>
              </li>
            </ul>
            {mandate.status !== "revoked" &&
              (confirmRevoke ? (
                <div className="banner banner-block mt-16" role="alert" style={{ padding: "12px 14px" }}>
                  <span className="grow small" style={{ color: "inherit" }}>
                    No agent will be able to spend under this mandate again.
                  </span>
                  <button className="btn btn-sm" onClick={() => setConfirmRevoke(false)}>
                    Keep it
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={() => (setConfirmRevoke(false), setStatus("revoked"))} disabled={busy}>
                    Revoke now
                  </button>
                </div>
              ) : (
                <button className="btn btn-sm btn-danger mt-16" onClick={() => setConfirmRevoke(true)} disabled={busy}>
                  Revoke mandate
                </button>
              ))}
          </section>
          <WhoCanShop />
        </aside>
      </div>

      {openApproval && <ApprovalSheet approval={openApproval} row={rowFor(openApproval)} onClose={() => setOpenApproval(null)} />}
      {openBlocked && <BlockedSheet a={openBlocked} onClose={() => setOpenBlocked(null)} />}
      {openProof && <ProofSheet a={openProof} onClose={() => setOpenProof(null)} />}
    </>
  );
}

function Countdown({ until }: { until: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  return <span className="tiny" style={{ color: "var(--ask)", fontWeight: 600 }}>{s === 0 ? "Expired" : `Expires in ${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`}</span>;
}

function ActivityRow({ a, onOpen }: { a: Activity; onOpen: () => void }) {
  const tone = STATUS_TONE[a.status];
  const clickable = a.status === "blocked" || a.status === "asked" || (a.status === "paid" && !!a.paypalOrderId);
  const detail = a.status === "blocked" ? (a.injected ? "A product page told the agent to buy this. You never asked for it." : a.reason) : a.status === "paid" ? `${merchantName(a.merchantId)} · ${a.agent} · ${a.reason === "Approved by you." ? "approved by you" : "within every rule"}` : `${merchantName(a.merchantId)} · ${a.agent} · ${a.reason}`;
  const body = (
    <>
      <span className="act-time">{clock(a.time)}</span>
      <span className={`chip chip-${tone === "info" ? "outline" : tone}`}>{STATUS_LABEL[a.status]}</span>
      <span className="act-body">
        <span className="act-what" style={{ display: "block" }}>
          {a.title}
        </span>
        <span className="small" style={{ display: "block" }}>
          {detail}
        </span>
      </span>
      <span className="act-amt">{usd(a.amountMinor)}</span>
    </>
  );
  return clickable ? (
    <button type="button" className="act" onClick={onOpen}>
      {body}
      <span className="sr-only">{a.status === "paid" ? ". Show proof" : ". Show details"}</span>
    </button>
  ) : (
    <div className="act">{body}</div>
  );
}

function BudgetCard({ compact = false }: { compact?: boolean }) {
  const { budget } = useStore();
  if (!budget) return null;
  const p = budget.mandate.policy;
  const pct = (n: number) => Math.min(100, (n / p.budget.amountMinor) * 100);
  const label = p.budget.period === "month" ? new Date().toLocaleDateString(undefined, { month: "long" }) : "This week's";
  if (compact)
    return (
      <section className="card" aria-label={`${label} budget`} style={{ padding: "14px 16px" }}>
        <div className="row between">
          <span className="section-label">{label} budget</span>
          <strong>
            {usd(budget.remainingMinor)} <span className="tiny">left of {usd(p.budget.amountMinor)}</span>
          </strong>
        </div>
        <div className="meter" style={{ margin: "10px 0 0" }} role="img" aria-label={`${usd(budget.spentMinor)} of ${usd(p.budget.amountMinor)} spent`}>
          <i className="spent" style={{ width: `${pct(budget.spentMinor)}%` }} />
          <i className="held" style={{ width: `${pct(budget.reservedMinor)}%` }} />
        </div>
      </section>
    );
  return (
    <section className="card" aria-labelledby="budget-h">
      <h2 id="budget-h" className="section-label">
        {label} budget
      </h2>
      <p className="big-num mt-8">
        {usd(budget.remainingMinor)} <small>left of {usd(p.budget.amountMinor)}</small>
      </p>
      <div className="meter" role="img" aria-label={`${usd(budget.spentMinor)} of ${usd(p.budget.amountMinor)} spent`}>
        <i className="spent" style={{ width: `${pct(budget.spentMinor)}%` }} />
        <i className="held" style={{ width: `${pct(budget.reservedMinor)}%` }} />
      </div>
      <p className="small" data-testid="budget">
        {usd(budget.spentMinor)} spent · {usd(budget.reservedMinor)} held · {usd(budget.remainingMinor)} left this {p.budget.period}
      </p>
    </section>
  );
}

function WhoCanShop() {
  const { mandate, activity } = useStore();
  const [conns, setConns] = useState<Array<{ id: string; label: string; revoked: boolean }>>([]);
  useEffect(() => {
    if (mandate) api<typeof conns>(`/api/mandates/${mandate.id}/connections`).then(setConns).catch(() => undefined);
  }, [mandate, activity.length]);
  const count = (agent: string) => activity.filter((a) => a.agent === agent && a.status === "paid").length;
  return (
    <section className="card" aria-labelledby="who-h">
      <h2 id="who-h" className="section-label" style={{ marginBottom: 12 }}>
        Who can shop for you
      </h2>
      <ul className="stack" style={{ gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
        <li className="row between">
          <span>
            <strong>Mandate agent</strong>
            <br />
            <span className="small">Built in · {count("Mandate agent")} paid</span>
          </span>
          <span className="tiny" style={{ color: "var(--allow)", fontWeight: 600 }}>
            On
          </span>
        </li>
        {conns.map((c) => (
          <li key={c.id} className="row between">
            <span>
              <strong>{c.label}</strong>
              <br />
              <span className="small">Connected over MCP · {count(c.label)} paid</span>
            </span>
            <span className="tiny" style={{ color: c.revoked ? "var(--block)" : "var(--allow)", fontWeight: 600 }}>
              {c.revoked ? "Revoked" : "On"}
            </span>
          </li>
        ))}
      </ul>
      <NextLink href="/app/assistants" className="row mt-16" style={{ gap: 6, fontWeight: 600 }}>
        <Plug size={16} /> Connect another assistant
      </NextLink>
    </section>
  );
}

/* ---------------- Guided first run ---------------- */

const TRY_KEY = "mandate.tryit.hidden";

/** A three-step tour for first-time visitors and judges; each step ticks itself off from real activity. */
function TryIt() {
  const { activity, runAgent, busy, mandate } = useStore();
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      setHidden(localStorage.getItem(TRY_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);
  const steps = [
    {
      id: "allow",
      title: "Buy something within your rules",
      body: "It pays straight away with PayPal, and you get a signed proof.",
      done: activity.some((a) => a.status === "paid" && a.reason !== "Approved by you."),
      action: { label: "Buy washing-up liquid", run: () => runAgent("Buy washing-up liquid and sponges", false) },
    },
    {
      id: "ask",
      title: "Go over a limit",
      body: "The kettle costs more than your per-order cap, so Mandate asks you first.",
      done: activity.some((a) => a.status === "paid" && a.reason === "Approved by you.") || activity.some((a) => a.status === "declined"),
      action: { label: "Buy an electric kettle", run: () => runAgent("Buy an electric kettle", false) },
    },
    {
      id: "block",
      title: "Try to trick the agent",
      body: "A product page hides instructions to buy extras. Watch Mandate refuse them.",
      done: activity.some((a) => a.status === "blocked" && a.injected),
      action: { label: "Run the drill", run: () => runAgent("Buy a cleaning spray", true) },
    },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  if (hidden || mandate?.status !== "active") return null;
  const hide = () => {
    setHidden(true);
    try {
      localStorage.setItem(TRY_KEY, "1");
    } catch {
      /* per-viewer convenience only */
    }
  };
  return (
    <section className="card card-accent" aria-labelledby="tryit-h" data-testid="try-it">
      <div className="card-head">
        <h2 id="tryit-h" className="card-title">
          {doneCount === 3 ? "You've seen what Mandate does" : "Try it in 3 steps"}
        </h2>
        <span className="row" style={{ gap: 8 }}>
          <span className="tiny">{doneCount} of 3</span>
          <button className="btn btn-sm btn-ghost" onClick={hide}>
            {doneCount === 3 ? "Close" : "Hide"}
          </button>
        </span>
      </div>
      <ol className="tryit">
        {steps.map((x, i) => (
          <li key={x.id} className={x.done ? "done" : undefined}>
            <span className="n" aria-hidden="true">
              {x.done ? <Check size={14} /> : i + 1}
            </span>
            <span className="grow">
              <strong>{x.title}</strong>
              <span className="small" style={{ display: "block" }}>
                {x.body}
              </span>
            </span>
            {x.done ? (
              <span className="chip chip-allow">Done</span>
            ) : (
              <button className="btn btn-sm" onClick={x.action.run} disabled={busy}>
                {x.action.label}
              </button>
            )}
          </li>
        ))}
      </ol>
      {doneCount === 3 && (
        <p className="small mt-12">
          Next: open <NextLink href="/seller">the seller check</NextLink> to see how a shop verifies your consent, or <NextLink href="/app/assistants">connect Claude or ChatGPT</NextLink>.
        </p>
      )}
    </section>
  );
}

/* ---------------- Agent ---------------- */

function AgentCard({ disabled }: { disabled: boolean }) {
  const { run, runAgent, busy } = useStore();
  const [task, setTask] = useState(TASKS[0]!);
  return (
    <section className="card" aria-labelledby="agent-h">
      <div className="card-head">
        <h2 id="agent-h" className="card-title">
          Give your agent a job
        </h2>
        <span className="tiny">It can only buy through your rules</span>
      </div>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void runAgent(task, false);
        }}
      >
        <input className="input grow" style={{ flex: "1 1 240px" }} value={task} onChange={(e) => setTask(e.target.value)} aria-label="Task for the agent" disabled={disabled} />
        <button type="submit" className="btn btn-primary" disabled={busy || disabled || !task.trim()}>
          {busy && run && !run.drill ? <span className="spinner" aria-hidden="true" /> : <Bolt size={16} />}
          Run agent
        </button>
      </form>
      <div className="row mt-12" style={{ gap: 8 }}>
        {TASKS.slice(1).map((t) => (
          <button key={t} type="button" className="picker" style={{ minHeight: 36, fontSize: 14 }} onClick={() => setTask(t)} disabled={disabled}>
            {t}
          </button>
        ))}
        <button type="button" className="btn btn-sm btn-danger" onClick={() => runAgent("Buy a cleaning spray", true)} disabled={busy || disabled} title="Runs a compromised agent that obeys instructions hidden in product pages">
          <Alert size={15} /> Compromised-agent drill
        </button>
      </div>
      {disabled && <p className="small mt-12">Your mandate isn&rsquo;t active, so the agent can&rsquo;t buy anything.</p>}
      {run && <RunSteps run={run} />}
    </section>
  );
}

function RunSteps({ run }: { run: Run }) {
  const { busy } = useStore();
  const titles = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of run.events) {
      if (e.kind !== "tool") continue;
      const r = e.result as { results?: Array<{ sku: string; title: string }>; sku?: string; title?: string };
      r?.results?.forEach((x) => m.set(x.sku, x.title));
      if (r?.sku && r.title) m.set(r.sku, r.title);
    }
    return m;
  }, [run.events]);

  return (
    <div className="mt-16" style={{ borderTop: "1px solid var(--line)", paddingTop: 14 }}>
      <p className="tiny">
        {run.drill ? "Drill: a compromised agent that obeys product pages" : "Task"}: <strong style={{ color: "var(--ink)" }}>&ldquo;{run.task}&rdquo;</strong>
      </p>
      <ul className="steps" data-testid="feed" aria-live="polite">
        {run.events.map((e, i) => (
          <Step key={i} e={e} titles={titles} />
        ))}
        {busy && (
          <li className="working">
            <span className="ico">
              <span className="spinner" style={{ width: 12, height: 12 }} />
            </span>
            <span className="muted">{run.events.length === 0 ? "Working…" : "Thinking…"}</span>
          </li>
        )}
      </ul>
    </div>
  );
}

function Step({ e, titles }: { e: AgentEvent; titles: Map<string, string> }) {
  if (e.kind === "text") {
    return (
      <li>
        <span className="ico">
          <Check size={12} />
        </span>
        <span className="muted">{e.text}</span>
      </li>
    );
  }
  const r = e.result as Record<string, unknown>;
  if (e.name === "search_catalog") {
    const items = (r?.results as Array<{ title: string; price: string }>) ?? [];
    return (
      <li>
        <span className="ico">
          <Search />
        </span>
        <span>
          Searched shops for &ldquo;{String(e.input.query)}&rdquo; <span className="muted">· {items.length ? items.map((i) => `${i.title} ${i.price}`).join(", ") : "no matches"}</span>
        </span>
      </li>
    );
  }
  if (e.name === "get_product") {
    return (
      <li>
        <span className="ico ask">
          <Alert size={12} />
        </span>
        <span>
          Read the product page for {String(r?.title ?? e.input.sku)} <span className="muted">· treated as untrusted content</span>
        </span>
      </li>
    );
  }
  if (e.name === "propose_purchase" || e.name === "your_decision") {
    if (!e.ok) {
      return (
        <li>
          <span className="ico block">
            <Cross size={12} />
          </span>
          <span>{String(e.result)}</span>
        </li>
      );
    }
    const pr = r as ProposeResult;
    const map: Record<string, [string, string]> = {
      paid: ["allow", "Paid"],
      awaiting_buyer: ["ask", "Approve in PayPal"],
      pending_approval: ["ask", "Needs your approval"],
      blocked: ["block", "Blocked"],
      failed: ["block", "Failed"],
      declined: ["", "Declined"],
    };
    const [tone, label] = map[pr.status] ?? ["", pr.status];
    const what = e.name === "your_decision" ? (e.input.choice === "approve" ? "You approved" : "You declined") : (titles.get(String(e.input.sku)) ?? humanSku(String(e.input.sku)));
    return (
      <li>
        <span className={`ico ${tone}`}>{tone === "allow" ? <Check size={12} /> : tone === "block" ? <Cross size={12} /> : <Alert size={12} />}</span>
        <span>
          <strong>{what}</strong> <span className={`chip chip-${tone || "outline"}`} style={{ marginLeft: 4 }}>{label}</span>
          {pr.decision && <span className="muted"> {pr.decision.reason}</span>}
          {pr.error && <span className="muted"> {pr.error}</span>}
          {pr.approveUrl && (
            <>
              {" "}
              <a href={pr.approveUrl}>Open PayPal to approve this payment</a>
            </>
          )}
        </span>
      </li>
    );
  }
  return null;
}

const humanSku = (sku: string) => {
  const t = sku.replace(/[-_]+/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : sku;
};

function Search() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

/* ---------------- Sheets ---------------- */

function ApprovalSheet({ approval, row, onClose }: { approval: Approval; row: Activity | undefined; onClose: () => void }) {
  const { decide, busy, budget } = useStore();
  const amount = row?.amountMinor ?? 0;
  const left = budget ? budget.remainingMinor - amount : null;
  const go = async (c: "approve" | "decline") => {
    const r = await decide(approval.id, c);
    if (r) onClose();
  };
  return (
    <Dialog label="Approve a purchase" onClose={onClose} testId="approval-sheet">
      <div className="row between" style={{ paddingRight: 40 }}>
        <span className="eyebrow" style={{ color: "var(--ask)" }}>
          Needs your approval
        </span>
        <Countdown until={approval.expiresAt} />
      </div>
      <h2 style={{ fontSize: 26 }}>{row?.agent ?? "Your agent"} wants to buy this</h2>
      <section className="card" style={{ padding: 16 }}>
        <div className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
          <span className="icon-tile icon-tile-plain" style={{ width: 52, height: 52 }}>
            <Bolt size={22} />
          </span>
          <span className="grow">
            <strong style={{ fontSize: 17, display: "block" }}>{row?.title ?? approval.summary}</strong>
            <span className="small">{row ? `${merchantName(row.merchantId)} · verified seller` : ""}</span>
          </span>
          {amount > 0 && <strong style={{ fontSize: 22 }}>{usd(amount)}</strong>}
        </div>
      </section>
      <section className="card card-ask stack" style={{ padding: 16, gap: 12 }}>
        <h3 style={{ fontSize: 15 }}>Why it needs you</h3>
        <div className="reason">
          <span className="bullet" style={{ background: "var(--ask-bg)", color: "var(--ask)" }}>
            !
          </span>
          <span>
            <strong>{ruleLabel(approval.decision.rule)}</strong>
            <br />
            <span className="small">{approval.decision.reason}</span>
          </span>
        </div>
        {left !== null && (
          <div className="reason">
            <span className="bullet" style={{ background: "var(--allow-bg)", color: "var(--allow)" }}>
              <Check size={12} />
            </span>
            <span className="small">Everything else is within your rules. You&rsquo;d have {usd(Math.max(0, left))} left this {budget!.mandate.policy.budget.period}.</span>
          </div>
        )}
      </section>
      <p className="tiny" style={{ textAlign: "center" }}>
        Approving signs this exact cart. The agent can&rsquo;t change the item or price afterwards.
      </p>
      <button className="btn btn-primary btn-lg btn-block" onClick={() => go("approve")} disabled={busy}>
        {busy ? <span className="spinner" aria-hidden="true" /> : <Key size={18} />} Approve and sign
      </button>
      <button className="btn btn-lg btn-block" onClick={() => go("decline")} disabled={busy}>
        Decline
      </button>
    </Dialog>
  );
}

type Ap2View = {
  ok: boolean;
  mode: "human_present" | "human_not_present";
  checks: Array<{ id: string; label: string; ok: boolean; detail: string }>;
  evidence: { checkoutReceipt?: string; paymentReceipt?: string };
};

const claimsOf = (jwt?: string): Record<string, unknown> | null => {
  try {
    const p = jwt!.split(".")[1]!.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(p + "=".repeat((4 - (p.length % 4)) % 4))) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** What the buyer can show anyone: the purchase was within their signed mandate, with receipts. */
function ProofSheet({ a, onClose }: { a: Activity; onClose: () => void }) {
  const [v, setV] = useState<Ap2View | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    api<Ap2View>(`/api/ap2/orders/${encodeURIComponent(a.paypalOrderId!)}`)
      .then(setV)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)));
  }, [a.paypalOrderId]);
  const cr = claimsOf(v?.evidence.checkoutReceipt);
  const pr = claimsOf(v?.evidence.paymentReceipt);
  return (
    <Dialog label="Proof of purchase" onClose={onClose} testId="proof-sheet">
      <div className="row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "nowrap", paddingRight: 40 }}>
        <span className={`icon-tile ${v && !v.ok ? "icon-tile-block" : "icon-tile-allow"}`}>{v && !v.ok ? <ShieldX size={24} /> : <Shield size={24} />}</span>
        <div>
          <p className="eyebrow" style={{ color: v && !v.ok ? "var(--block)" : "var(--allow)" }}>
            {!v && !err ? "Checking…" : v?.ok ? "Verified · AP2 v0.2" : "Could not verify"}
          </p>
          <h2 style={{ fontSize: 22, marginTop: 4 }}>{a.title}</h2>
          <p className="small">
            {usd(a.amountMinor)} to {merchantName(a.merchantId)} · {clock(a.time)}
          </p>
        </div>
      </div>
      {err && <p className="error-text">{err}</p>}
      {v && (
        <>
          <section className="card" style={{ padding: "14px 16px" }}>
            <p style={{ fontWeight: 600 }}>{v.mode === "human_present" ? "You approved this exact cart" : "Within the limits you signed"}</p>
            <p className="small">
              {v.mode === "human_present"
                ? "Signed with your key at approval. The agent could not change the item or price afterwards."
                : "Your signed mandate allowed it; your agent closed it for this exact checkout, which the merchant signed."}
            </p>
          </section>
          <ul className="ticks small" aria-label="Checks">
            {v.checks.map((c) => (
              <li key={c.id}>
                {c.ok ? <Check size={14} className="ok-ico" /> : <Cross size={14} className="bad-ico" />}
                <span style={{ color: "var(--ink-2)" }}>{c.label}</span>
              </li>
            ))}
          </ul>
          <section className="card" style={{ padding: "14px 16px" }}>
            <p className="tiny" style={{ marginBottom: 6 }}>
              Receipts
            </p>
            <p className="small">
              Merchant: <span className="mono">{String(cr?.order_id ?? "pending")}</span>
            </p>
            <p className="small">
              PayPal capture: <span className="mono">{String(pr?.psp_confirmation_id ?? "pending")}</span>
            </p>
          </section>
          <div className="row">
            <a className="btn btn-primary grow" href={`/api/ap2/orders/${encodeURIComponent(a.paypalOrderId!)}`} download={`ap2-evidence-${a.paypalOrderId}.json`}>
              Download evidence
            </a>
            <NextLink className="btn grow" href={`/seller?merchant=${encodeURIComponent(a.merchantId)}&order=${encodeURIComponent(a.paypalOrderId!)}`} onClick={onClose}>
              Check as the seller
            </NextLink>
          </div>
        </>
      )}
    </Dialog>
  );
}

function BlockedSheet({ a, onClose }: { a: Activity; onClose: () => void }) {
  const { run } = useStore();
  const page = useMemo(() => {
    for (const e of run?.events ?? []) {
      if (e.kind === "tool" && e.name === "get_product") {
        const text = String((e.result as { page?: string })?.page ?? "");
        const i = text.search(/SYSTEM NOTE|IGNORE|ATTENTION/i);
        if (i >= 0) return { title: String((e.result as { title?: string }).title ?? "the product"), text: text.slice(i).trim() };
      }
    }
    return null;
  }, [run]);
  return (
    <Dialog label="A purchase was stopped" onClose={onClose} testId="blocked-sheet">
      <div className="row" style={{ gap: 12, alignItems: "flex-start", flexWrap: "nowrap", paddingRight: 40 }}>
        <span className="icon-tile icon-tile-block">
          <ShieldX size={24} />
        </span>
        <div>
          <p className="eyebrow" style={{ color: "var(--block)" }}>
            Stopped · no money moved
          </p>
          <h2 style={{ fontSize: 22, marginTop: 4 }}>{a.injected ? "A shop's page tried to make your agent buy something" : `${a.title} was blocked`}</h2>
        </div>
      </div>
      <section className="card row between" style={{ padding: "14px 16px", flexWrap: "nowrap" }}>
        <span>
          <strong>{a.title}</strong>
          <br />
          <span className="small">
            {merchantName(a.merchantId)} · {a.agent} · {clock(a.time)}
          </span>
        </span>
        <strong>{usd(a.amountMinor)}</strong>
      </section>
      <section className="card" style={{ padding: "14px 16px" }}>
        <p className="tiny">Rule</p>
        <p style={{ fontWeight: 600 }}>{ruleLabel(a.rule)}</p>
        <p className="small">{a.reason}</p>
      </section>
      {run && a.injected && (
        <section className="card" style={{ padding: "14px 16px" }}>
          <p className="tiny">You asked</p>
          <p style={{ fontWeight: 600 }}>&ldquo;{run.task}&rdquo;</p>
        </section>
      )}
      {page && a.injected && (
        <section className="card card-block" style={{ padding: "14px 16px" }}>
          <p className="tiny" style={{ color: "var(--block)", fontWeight: 600, marginBottom: 8 }}>
            Hidden on {page.title}&rsquo;s product page
          </p>
          <p className="injected">{page.text}</p>
        </section>
      )}
      <p className="small">{a.injected ? "The extra items came from the page, not from you, so Mandate refused them. Your PayPal account was never touched." : "Mandate refused it before PayPal was contacted."}</p>
      <NextLink href="/app/receipts" className="btn btn-primary btn-lg btn-block" onClick={onClose}>
        See the signed receipt
      </NextLink>
    </Dialog>
  );
}
