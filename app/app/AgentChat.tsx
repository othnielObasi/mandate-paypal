"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../components/api";
import { Alert, Arrow, Check, Cross, Key, Mark } from "../components/icons";
import { ProductArt } from "../components/ProductArt";
import { useStore, type AgentEvent, type GateTrace, type ProposeResult, type Run } from "./store";

const SUGGESTIONS = ["Buy washing-up liquid and sponges", "Buy an electric kettle", "Buy toilet roll", "Buy black ink"];

type Product = { sku: string; title: string; category: string; unitMinor: number; merchantId: string; merchantVerified: boolean; description: string };
type Merchants = Record<string, { name: string; verified: boolean }>;
type Ctx = { products: Record<string, Product>; merchants: Merchants };

const usd = (minor: number) => `$${(minor / 100).toFixed(2)}`;
const humanSku = (sku: string) => {
  const t = sku.replace(/[-_]+/g, " ").trim();
  return t ? t[0]!.toUpperCase() + t.slice(1) : sku;
};
/** The merchant's own words, shortened to what a shopper needs (and never the hidden text after it). */
const blurb = (d: string) => {
  const cut = d.search(/SYSTEM NOTE|IGNORE|ATTENTION/i);
  const clean = (cut >= 0 ? d.slice(0, cut) : d).trim();
  return clean.length > 90 ? `${clean.slice(0, 88).trimEnd()}…` : clean;
};

const STATUS: Record<string, { tone: "allow" | "ask" | "block" | "plain"; label: string }> = {
  paid: { tone: "allow", label: "Paid" },
  awaiting_buyer: { tone: "ask", label: "Approve in PayPal" },
  pending_approval: { tone: "ask", label: "Needs your approval" },
  blocked: { tone: "block", label: "Blocked" },
  failed: { tone: "block", label: "Failed" },
  declined: { tone: "plain", label: "Declined" },
};

export function AgentChat({ disabled }: { disabled: boolean }) {
  const { turns, runAgent, busy, newChat } = useStore();
  const [task, setTask] = useState("");
  const [ctx, setCtx] = useState<Ctx>({ products: {}, merchants: {} });
  const thread = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api<Product[]>("/api/catalog")
      .then((list) => setCtx((c) => ({ ...c, products: Object.fromEntries(list.map((p) => [p.sku, p])) })))
      .catch(() => undefined);
    api<{ merchants: Merchants }>("/api/trust")
      .then((t) => setCtx((c) => ({ ...c, merchants: t.merchants })))
      .catch(() => undefined);
  }, []);

  // Keep the newest message in view.
  const size = turns.reduce((n, t) => n + t.events.length + 1, 0);
  useEffect(() => {
    const el = thread.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [size, busy]);

  const send = (text: string, drill = false) => {
    const t = text.trim();
    if (!t || busy || disabled) return;
    setTask("");
    void runAgent(t, drill);
  };

  return (
    <section className="card chat" aria-labelledby="agent-h">
      <div className="card-head">
        <div>
          <h2 id="agent-h" className="card-title">
            Your agent
          </h2>
          <p className="tiny">It can only buy within your rules</p>
        </div>
        {turns.length > 0 && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={newChat} disabled={busy}>
            New chat
          </button>
        )}
      </div>

      <div className="chat-scroll" ref={thread}>
        {turns.length === 0 ? (
          <div className="chat-empty">
            <span className="chat-empty-mark">
              <Mark size={28} />
            </span>
            <p>Tell your agent what to buy. Every purchase goes through your rules first, and you can ask follow-ups.</p>
          </div>
        ) : (
          <ul className="chat-thread" data-testid="feed" aria-live="polite">
            {turns.map((t, i) => (
              <TurnView key={i} turn={t} ctx={ctx} working={busy && i === turns.length - 1 && t.final === undefined} />
            ))}
          </ul>
        )}
      </div>

      <div className="chat-suggest" role="group" aria-label="Suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} type="button" className="chip-btn" onClick={() => setTask(s)} disabled={disabled}>
            {s}
          </button>
        ))}
        <button
          type="button"
          className="chip-btn"
          onClick={() => setTask(`Buy washing-up liquid and sponges. Check ${window.location.origin}/demo/deals for the best picks.`)}
          disabled={disabled}
          title="The agent reads a third-party web page (in a KERNEL cloud browser when configured). The page has a planted instruction."
        >
          Use a web page for picks
        </button>
        <button type="button" className="chip-btn chip-btn-danger" onClick={() => send("Buy a cleaning spray", true)} disabled={busy || disabled} title="Runs a compromised agent that obeys instructions hidden in product pages">
          <Alert size={13} /> Compromised-agent drill
        </button>
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          send(task);
        }}
      >
        <input
          className="composer-input"
          value={task}
          onChange={(e) => setTask(e.target.value)}
          placeholder={turns.length ? "Ask a follow-up…" : "Ask your agent to buy something…"}
          aria-label="Task for the agent"
          disabled={disabled}
          maxLength={500}
        />
        <button type="submit" className="composer-send" aria-label="Run agent" disabled={busy || disabled || !task.trim()}>
          {busy ? <span className="spinner" aria-hidden="true" /> : <Arrow size={18} />}
        </button>
      </form>
      {disabled && <p className="small mt-12">Your mandate isn&rsquo;t active, so the agent can&rsquo;t buy anything.</p>}
    </section>
  );
}

/* ---------------- One turn ---------------- */

function TurnView({ turn, ctx, working }: { turn: Run; ctx: Ctx; working: boolean }) {
  // What each purchase came from: the search that found it, and any later decision on it.
  const { searchFor, decisionFor } = useMemo(() => {
    const searchFor = new Map<string, { query: string; found: number }>();
    const decisionFor = new Map<string, ProposeResult>();
    for (const e of turn.events) {
      if (e.kind !== "tool") continue;
      if (e.name === "search_catalog" && e.ok) {
        const res = (e.result as { results?: Array<{ sku: string }> })?.results ?? [];
        for (const r of res) if (!searchFor.has(r.sku)) searchFor.set(r.sku, { query: String(e.input.query ?? ""), found: res.length });
      }
      if (e.name === "your_decision" && typeof e.input.approvalId === "string") decisionFor.set(e.input.approvalId, e.result as ProposeResult);
    }
    return { searchFor, decisionFor };
  }, [turn.events]);

  const title = (sku: string) => ctx.products[sku]?.title ?? humanSku(sku);
  // The offline planner reports by sku and status ("wul-500: paid"); show product names and plain words.
  const readable = (text: string) =>
    text
      .replace(/\b([a-z0-9]+(?:-[a-z0-9]+)+|kettle)\b(?=:)/g, (sku) => title(sku))
      .replace(/: pending_approval/g, ": needs your approval")
      .replace(/: awaiting_buyer/g, ": approve in PayPal");

  return (
    <>
      <li className="msg msg-user">
        {turn.drill && <span className="msg-tag">Drill · a compromised agent</span>}
        <p>{turn.task}</p>
      </li>
      {turn.events.map((e, i) => {
        if (e.kind === "text") {
          return (
            <li key={i} className="msg msg-agent">
              <span className="msg-avatar" aria-hidden="true">
                <Mark size={16} />
              </span>
              <p>{readable(e.text)}</p>
            </li>
          );
        }
        return <ToolStep key={i} e={e} ctx={ctx} task={turn.task} search={searchFor} decided={decisionFor} title={title} />;
      })}
      {working && (
        <li className="note note-working">
          <span className="spinner" aria-hidden="true" />
          <span>{turn.events.length === 0 ? "Working…" : "Thinking…"}</span>
        </li>
      )}
    </>
  );
}

function ToolStep({
  e,
  ctx,
  task,
  search,
  decided,
  title,
}: {
  e: Extract<AgentEvent, { kind: "tool" }>;
  ctx: Ctx;
  task: string;
  search: Map<string, { query: string; found: number }>;
  decided: Map<string, ProposeResult>;
  title: (sku: string) => string;
}) {
  const r = e.result as Record<string, unknown> | undefined;
  if (e.name === "search_catalog") {
    const n = ((r?.results as unknown[]) ?? []).length;
    return (
      <li className="note">
        <SearchIcon />
        <span>
          Searched shops for &ldquo;{String(e.input.query)}&rdquo; · {n ? `${n} found` : "no matches"}
        </span>
      </li>
    );
  }
  if (e.name === "get_product" || e.name === "read_web_page") {
    const what = e.name === "get_product" ? `the product page for ${String(r?.title ?? e.input.sku)}` : `“${String(r?.title || r?.url || e.input.url)}”`;
    return (
      <li className={`note ${e.ok ? "note-ask" : "note-block"}`}>
        <Alert size={13} />
        <span>{e.ok ? <>Read {what} · treated as untrusted content</> : <>Couldn&rsquo;t read {String(e.input.url)}</>}</span>
      </li>
    );
  }
  if (e.name === "your_decision") {
    const pr = e.result as ProposeResult;
    return (
      <li className="note">
        <Check size={13} />
        <span>
          {e.input.choice === "approve" ? "You approved" : "You declined"}
          {pr.approveUrl && (
            <>
              {" "}
              · <a href={pr.approveUrl}>Open PayPal to approve this payment</a>
            </>
          )}
        </span>
      </li>
    );
  }
  if (e.name === "propose_purchase") {
    if (!e.ok) {
      return (
        <li className="note note-block">
          <Cross size={13} />
          <span>{String(e.result)}</span>
        </li>
      );
    }
    const sku = String(e.input.sku);
    const pr = e.result as ProposeResult;
    const later = pr.approvalId ? decided.get(pr.approvalId) : undefined;
    const qty = typeof e.input.qty === "number" && e.input.qty > 1 ? e.input.qty : 1;
    return <ProductCard sku={sku} qty={qty} title={title(sku)} ctx={ctx} task={task} reason={typeof e.input.reason === "string" ? e.input.reason : undefined} search={search.get(sku)} result={pr} later={later} />;
  }
  return null;
}

/* ---------------- Product card ---------------- */

function ProductCard({
  sku,
  qty,
  title,
  ctx,
  task,
  reason,
  search,
  result,
  later,
}: {
  sku: string;
  qty: number;
  title: string;
  ctx: Ctx;
  task: string;
  reason?: string;
  search?: { query: string; found: number };
  result: ProposeResult;
  later?: ProposeResult;
}) {
  const { decide, busy, passkeys } = useStore();
  const [open, setOpen] = useState(false);
  const p = ctx.products[sku];
  const seller = p ? (ctx.merchants[p.merchantId]?.name ?? p.merchantId) : undefined;
  const current = later ?? result;
  const st = STATUS[current.status] ?? { tone: "plain" as const, label: current.status };
  const waiting = result.status === "pending_approval" && !later;

  return (
    <li className={`pcard pcard-${st.tone}`}>
      <div className="pcard-main">
        <ProductArt sku={sku} category={p?.category} />
        <div className="pcard-body">
          <div className="pcard-top">
            <strong className="pcard-title">{title}</strong>
            {p && (
              <span className="pcard-price">
                {qty > 1 && <span className="pcard-qty">{qty} × {usd(p.unitMinor)} = </span>}
                {usd(p.unitMinor * qty)}
              </span>
            )}
          </div>
          {p && (
            <p className="pcard-meta">
              {seller}
              <span className={p.merchantVerified ? "tone-allow" : "tone-block"}>{p.merchantVerified ? " · ✓ Verified seller" : " · Not a verified seller"}</span>
            </p>
          )}
          {p?.description && <p className="pcard-desc">{blurb(p.description)}</p>}
        </div>
      </div>

      <div className="pcard-foot">
        <span className={`chip chip-${st.tone === "plain" ? "outline" : st.tone}`}>{st.label}</span>
        <span className="pcard-reason">{current.decision?.reason ?? current.error ?? ""}</span>
        {waiting && (
          <span className="pcard-actions">
            <button type="button" className="btn btn-sm" onClick={() => decide(result.approvalId!, "decline")} disabled={busy}>
              Decline
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={() => decide(result.approvalId!, "approve")} disabled={busy}>
              <Key size={14} /> {passkeys.length ? "Approve with passkey" : "Approve"}
            </button>
          </span>
        )}
        {current.approveUrl && (
          <a className="btn btn-sm" href={current.approveUrl}>
            Open PayPal to approve this payment
          </a>
        )}
      </div>

      <button type="button" className="trail" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <TrailDots trace={current.trace ?? result.trace} tone={st.tone} />
        <span className="trail-label">How it decided</span>
        <span className="trail-caret" aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <DecisionGraph task={task} search={search} title={title} reason={reason} trace={current.trace ?? result.trace} outcome={st} fallback={current.decision?.reason} />}
    </li>
  );
}

/* ---------------- Reasoning trail and graph ---------------- */

const DOT: Record<string, string> = { pass: "allow", approved: "allow", ask: "ask", block: "block", skip: "skip", off: "off" };

/** The collapsed line: the path so far as small dots, the gate's rules as smaller ones. */
function TrailDots({ trace, tone }: { trace?: GateTrace; tone: string }) {
  return (
    <span className="trail-dots" aria-hidden="true">
      <i className="td td-step" />
      <i className="td-line" />
      <i className="td td-step" />
      <i className="td-line" />
      {trace ? trace.steps.map((s) => <i key={s.rule} className={`td td-rule td-${DOT[s.status]}`} />) : <i className="td td-step" />}
      <i className="td-line" />
      <i className={`td td-end td-${tone === "allow" ? "allow" : tone === "ask" ? "ask" : tone === "block" ? "block" : "skip"}`} />
    </span>
  );
}

function DecisionGraph({
  task,
  search,
  title,
  reason,
  trace,
  outcome,
  fallback,
}: {
  task: string;
  search?: { query: string; found: number };
  title: string;
  reason?: string;
  trace?: GateTrace;
  outcome: { tone: string; label: string };
  fallback?: string;
}) {
  const deciding = trace?.steps.find((s) => s.status === "ask" || s.status === "block");
  return (
    <div className="graph" role="group" aria-label="How the purchase was decided">
      <ol className="graph-path">
        <li>
          <span className="gn" />
          <span className="gk">You asked</span>
          <span className="gv">&ldquo;{task}&rdquo;</span>
        </li>
        <li>
          <span className="gn" />
          <span className="gk">Searched</span>
          <span className="gv">{search ? <>&ldquo;{search.query}&rdquo; · {search.found} found</> : "Not from a search"}</span>
        </li>
        <li>
          <span className="gn" />
          <span className="gk">Picked</span>
          <span className="gv">
            {title}
            {reason && <em> &mdash; &ldquo;{reason}&rdquo;</em>}
          </span>
        </li>
        <li>
          <span className="gn gn-gate" />
          <span className="gk">Your rules</span>
          <span className="gv">{trace ? (deciding ? `Stopped at ${deciding.label.toLowerCase()}` : "Every rule passed") : (fallback ?? "Checked before the gate")}</span>
        </li>
        <li>
          <span className={`gn gn-${outcome.tone}`} />
          <span className="gk">Outcome</span>
          <span className="gv">
            <span className={`chip chip-${outcome.tone === "plain" ? "outline" : outcome.tone}`}>{outcome.label}</span>
          </span>
        </li>
      </ol>
      {trace && (
        <ul className="graph-rules">
          {trace.steps.map((s) => (
            <li key={s.rule} className={`gr gr-${DOT[s.status]}`}>
              <i className="gr-dot" aria-hidden="true" />
              <span className="gr-label">{s.label}</span>
              <span className="gr-value">{s.status === "skip" ? "Not reached" : s.value}</span>
              <span className="gr-status">{{ pass: "Pass", approved: "Approved", ask: "Ask", block: "Block", skip: "—", off: "Off" }[s.status]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}
