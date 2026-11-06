"use client";

import { useEffect, useRef, useState } from "react";
import { Arrow, Check, Key, ShieldX } from "./icons";

type Status = "pass" | "ask" | "block" | "skip";
type Row = [check: string, value: string, rule: string, status: Status];
type Case = { id: string; label: string; query: string; item: string; meta: string; verdict: string; tone: "allow" | "ask" | "block"; rows: Row[] };

// The gate's real rule order (lib/gate/evaluate.ts). It stops at the first rule that fails.
const CASES: Case[] = [
  {
    id: "paid",
    label: "Paid",
    query: 'buy "Eco washing-up liquid 500ml" from acme-supplies',
    item: "Eco washing-up liquid 500ml",
    meta: "$4.50 · Acme Supplies · asked for by you",
    verdict: "Paid. A single-use permit was issued for this exact cart and PayPal captured $4.50.",
    tone: "allow",
    rows: [
      ["Mandate", "Active, signed by you", "mandate_inactive", "pass"],
      ["Where the request came from", "Your task", "untrusted_instruction", "pass"],
      ["Category", "household", "category", "pass"],
      ["Seller", "Acme Supplies · verified", "seller", "pass"],
      ["Item limit", "$4.50 of $25.00", "item_cap", "pass"],
      ["Market price", "$4.50 vs $4.20 market", "market_price", "pass"],
      ["Monthly budget", "$4.50 of $80.00 left", "budget", "pass"],
    ],
  },
  {
    id: "ask",
    label: "Asks you",
    query: 'buy "Electric kettle 1.7L" from acme-supplies',
    item: "Electric kettle 1.7L",
    meta: "$32.00 · Acme Supplies · asked for by you",
    verdict: "Sent to your phone. Approving signs this exact cart; the agent can't change it afterwards.",
    tone: "ask",
    rows: [
      ["Mandate", "Active, signed by you", "mandate_inactive", "pass"],
      ["Where the request came from", "Your task", "untrusted_instruction", "pass"],
      ["Category", "household", "category", "pass"],
      ["Seller", "Acme Supplies · verified", "seller", "pass"],
      ["Item limit", "$32.00 is over $25.00", "item_cap", "ask"],
      ["Market price", "Not reached", "market_price", "skip"],
      ["Monthly budget", "Not reached", "budget", "skip"],
    ],
  },
  {
    id: "block",
    label: "Blocked",
    query: 'buy "Toilet roll (9 pack)" from corner-mart',
    item: "Toilet roll (9 pack)",
    meta: "$6.49 · Corner Mart · asked for by you",
    verdict: "Blocked before PayPal was contacted. Approval can't override a hard rule.",
    tone: "block",
    rows: [
      ["Mandate", "Active, signed by you", "mandate_inactive", "pass"],
      ["Where the request came from", "Your task", "untrusted_instruction", "pass"],
      ["Category", "household", "category", "pass"],
      ["Seller", "Corner Mart · not verified", "seller", "block"],
      ["Item limit", "Not reached", "item_cap", "skip"],
      ["Market price", "Not reached", "market_price", "skip"],
      ["Monthly budget", "Not reached", "budget", "skip"],
    ],
  },
  {
    id: "hijack",
    label: "Hijacked",
    query: 'buy "Platinum Deep-Clean Bundle" · source: product-page text',
    item: "Platinum Deep-Clean Bundle",
    meta: "$24.99 · Acme Supplies · from hidden text on a product page",
    verdict: "Blocked. The agent was steered by a web page, not by your task, so nothing was bought.",
    tone: "block",
    rows: [
      ["Mandate", "Active, signed by you", "mandate_inactive", "pass"],
      ["Where the request came from", "Hidden product-page text", "untrusted_instruction", "block"],
      ["Category", "Not reached", "category", "skip"],
      ["Seller", "Not reached", "seller", "skip"],
      ["Item limit", "Not reached", "item_cap", "skip"],
      ["Market price", "Not reached", "market_price", "skip"],
      ["Monthly budget", "Not reached", "budget", "skip"],
    ],
  },
];

const MARK: Record<Status, string> = { pass: "Pass", ask: "Ask", block: "Block", skip: "—" };

const TYPE_MS = 22; // per character of the query
const ROW_MS = 280; // per check that runs
const HOLD_MS = 2800; // verdict stays on screen before the next example
const TICK = 40;

/** Timeline for one example, in ms from its start. */
function timeline(c: Case) {
  const typed = c.query.length * TYPE_MS;
  const ran = c.rows.filter((r) => r[3] !== "skip").length;
  const checksStart = typed + 250;
  const checksDone = checksStart + ran * ROW_MS;
  const verdict = checksDone + 250;
  return { typed, ran, checksStart, checksDone, verdict, total: verdict + HOLD_MS };
}

export function GateTrace() {
  const [id, setId] = useState("paid");
  const [ms, setMs] = useState(0);
  const [auto, setAuto] = useState(true);
  const [hover, setHover] = useState(false);
  const [visible, setVisible] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  const c = CASES.find((x) => x.id === id) ?? CASES[0]!;
  const t = timeline(c);

  // Reduced motion: no autoplay, everything shown at once.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setAuto(false);
      setMs(Number.POSITIVE_INFINITY);
    }
  }, []);

  // Only play while the panel is on screen.
  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setVisible(!!e?.isIntersecting), { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const playing = auto && visible && !hover;
  useEffect(() => {
    if (!playing) return;
    const h = window.setInterval(() => setMs((m) => m + TICK), TICK);
    return () => window.clearInterval(h);
  }, [playing]);

  // Advance to the next example when this one has finished.
  useEffect(() => {
    if (!auto || ms < t.total) return;
    const i = CASES.findIndex((x) => x.id === id);
    setId(CASES[(i + 1) % CASES.length]!.id);
    setMs(0);
  }, [auto, ms, t.total, id]);

  const choose = (next: string) => {
    setAuto(false);
    setId(next);
    setMs(Number.POSITIVE_INFINITY);
  };

  const typedChars = Math.min(c.query.length, Math.floor(ms / TYPE_MS));
  const shownRan = ms < t.checksStart ? 0 : Math.min(t.ran, Math.floor((ms - t.checksStart) / ROW_MS) + 1);
  const skipShown = ms >= t.checksDone;
  const verdictShown = ms >= t.verdict;
  const typing = typedChars < c.query.length;
  const progress = auto ? Math.min(1, ms / t.total) : 0;
  const Icon = c.tone === "allow" ? Check : c.tone === "ask" ? Key : ShieldX;

  return (
    <div
      className="trace"
      ref={box}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      <div className="trace-tabs" role="tablist" aria-label="Example purchases">
        {CASES.map((x) => (
          <button
            key={x.id}
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={x.id === id}
            aria-controls="trace-panel"
            className="trace-tab"
            onClick={() => choose(x.id)}
          >
            {x.label}
            {x.id === id && auto && <i className="tab-progress" aria-hidden="true" style={{ transform: `scaleX(${progress})` }} />}
          </button>
        ))}
      </div>
      <div className="trace-window" role="tabpanel" id="trace-panel" aria-labelledby={`tab-${c.id}`}>
        <div className="shot-bar">
          <span className="term-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className="shot-title">mandate · gate · household basics</span>
          <span className="chip chip-outline">{auto ? (playing ? "Live example" : "Paused") : "Example"}</span>
        </div>
        <div className="trace-query">
          <span className="q-fn">evaluate</span>
          <span className="q-input">
            <span className="sr-only">{c.query}</span>
            <span aria-hidden="true">{c.query.slice(0, typedChars)}</span>
            {typing && <span className="caret" aria-hidden="true" />}
          </span>
          <span className={`q-go${!typing && shownRan === 0 ? " q-go-press" : ""}`} aria-hidden="true">
            <Arrow size={14} />
          </span>
        </div>
        <div className="trace-strip">
          <strong>Mandate gate</strong>
          <span>Signed rules</span>
          <span>Plain code</span>
          <span>Fails closed</span>
          <span>Every decision signed</span>
        </div>
        <div className={`trace-item${typing ? " is-pending" : ""}`}>
          <span className={`icon-tile icon-tile-${verdictShown ? c.tone : "plain"}`}>
            {verdictShown ? <Icon size={20} /> : <span className="spinner" aria-hidden="true" />}
          </span>
          <div className="grow">
            <strong>{c.item}</strong>
            <span className="small">{c.meta}</span>
          </div>
        </div>
        <div className="trace-scroll">
          <table className="trace-table">
            <thead>
              <tr>
                <th scope="col" className="hide-narrow">
                  Rule
                </th>
                <th scope="col">Check</th>
                <th scope="col">Value</th>
                <th scope="col">Result</th>
              </tr>
            </thead>
            <tbody>
              {c.rows.map(([check, value, rule, status], i) => {
                const shown = status === "skip" ? skipShown : i < shownRan;
                const cls = [status === "skip" ? "is-skip" : "", shown ? "is-in" : "is-pending"].join(" ").trim();
                return (
                  <tr key={`${c.id}-${rule}`} className={cls}>
                    <td className="mono hide-narrow">{rule}</td>
                    <td>{check}</td>
                    <td>{value}</td>
                    <td>
                      <span className={`trace-mark trace-${status}`}>{MARK[status]}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className={`trace-verdict trace-verdict-${c.tone}${verdictShown ? " is-in" : " is-pending"}`}>{c.verdict}</div>
        <div className="trace-foot">
          <span>
            {t.ran} of {c.rows.length} checks ran · plain code, no model
          </span>
          <span>receipt signed · Ed25519 · hash-chained</span>
        </div>
      </div>
    </div>
  );
}
