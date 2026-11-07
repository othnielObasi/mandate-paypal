"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

type Tone = "you" | "live" | "ask" | "block" | "opt";
type Card = {
  k: string;
  icon: string;
  title: string;
  sub: string;
  tone: Tone;
  chip: string;
  isNew?: boolean;
  /** Grid placement on the 3-column boards, and wires to the right / below. */
  col?: number;
  row?: number;
  right?: boolean;
  down?: boolean;
  /** Popover. */
  head: string;
  body: ReactNode;
};

const RULES: Array<[string, "block" | "ask"]> = [
  ["Mandate", "block"],
  ["Request came from", "block"],
  ["Category", "block"],
  ["Seller", "block"],
  ["Item limit", "ask"],
  ["Market price", "ask"],
  ["Budget", "ask"],
];

const SETUP: Card[] = [
  { k: "words", icon: "pen", title: "Your words", sub: "Plain English", tone: "you", chip: "You", col: 1, row: 1, right: true, head: "Write your rules",
    body: <p>Say what your agents may buy, in plain English: &ldquo;Household basics, up to $80 a month, nothing over $25, verified sellers only.&rdquo;</p> },
  { k: "rules", icon: "list", title: "Your rules", sub: "Check and edit", tone: "you", chip: "You + AI", col: 2, row: 1, right: true, head: "Check and edit",
    body: <p>The AI turns your words into rules: budget, item limit, categories, sellers, fair price and expiry. You fix anything it got wrong before signing.</p> },
  { k: "signed", icon: "seal", title: "Mandate", sub: "AP2 Intent Mandate", tone: "live", chip: "✓ Signed", col: 3, row: 1, down: true, head: "Sign and activate",
    body: <p>Your consent is signed as an AP2 Intent Mandate. Sellers can later check that you really agreed.</p> },
  { k: "wallet", icon: "wallet", title: "Connect PayPal", sub: "PayPal Vault", tone: "opt", chip: "Optional", isNew: true, col: 2, row: 2, right: true, head: "Connect PayPal",
    body: (
      <>
        <p>Log in with PayPal and agree once. PayPal saves your wallet for Mandate (PayPal Vault). Mandate never sees your password or card.</p>
        <p>Disconnect any time, and each purchase needs a PayPal approval again.</p>
      </>
    ) },
  { k: "passkey", icon: "key", title: "Passkey", sub: "Device approvals", tone: "opt", chip: "Optional", col: 3, row: 2, head: "Add a passkey",
    body: <p>Approvals are then signed on your device with Face ID, fingerprint or PIN, so nobody else can approve for you.</p> },
];

const PURCHASE: Card[] = [
  { k: "task", icon: "chat", title: "Your task", sub: "Chat, multi-turn", tone: "you", chip: "You", col: 2, row: 1, down: true, head: "Ask the agent",
    body: (
      <>
        <p>&ldquo;Buy washing-up liquid.&rdquo; Follow-ups in the same chat are fine: &ldquo;Also get two packs of sponges.&rdquo;</p>
        <p>The agent can search and suggest. It can never pay.</p>
      </>
    ) },
  { k: "pages", icon: "globe", title: "Web pages", sub: "Read, never obeyed", tone: "block", chip: "Untrusted", col: 1, row: 2, right: true, head: "Web pages",
    body: (
      <>
        <p>If you give a link, the agent reads the page for information, like reviews or which brand to pick.</p>
        <span className="mm-note">Instructions on web pages and in product text never count as yours.</span>
      </>
    ) },
  { k: "agent", icon: "bot", title: "Agent", sub: "Searches and picks", tone: "live", chip: "Proposes", col: 2, row: 2, right: true, down: true, head: "Searches and picks a product",
    body: <p>Searches the catalogue and, if you give a link, reads the page. It picks an item, gives a one-line reason, and proposes the purchase to the gate.</p> },
  { k: "catalog", icon: "box", title: "Catalogue", sub: "Products and prices", tone: "live", chip: "✓ Sellers", col: 3, row: 2, head: "Catalogue",
    body: <p>Products, prices and sellers. Each seller is marked verified or not, and the market price is looked up so the fair-price rule can compare.</p> },
  { k: "blocked", icon: "x", title: "Blocked", sub: "Rule named in chat", tone: "block", chip: "✕ Nothing paid", col: 1, row: 3, right: true, head: "Blocked",
    body: (
      <>
        <p>A hard rule fails, for example an unverified seller or a hijacked request.</p>
        <p>Nothing is paid. The chat and the log say which rule stopped it.</p>
      </>
    ) },
  { k: "gate", icon: "gate", title: "Policy gate", sub: "Checks every purchase", tone: "live", chip: "7 rules", col: 2, row: 3, right: true, down: true, head: "The gate checks 7 rules, in order",
    body: (
      <>
        <p>Checked in this order. The chat shows each one under &ldquo;How it decided&rdquo;.</p>
        <ol className="mm-rules">
          {RULES.map(([r, t]) => (
            <li key={r}>
              <b>{r}</b>
              <span className={`mm-chip ${t}`}>{t === "block" ? "blocks" : "asks you"}</span>
            </li>
          ))}
        </ol>
      </>
    ) },
  { k: "ask", icon: "hand", title: "Needs you", sub: "Approve or decline", tone: "ask", chip: "Asks you", col: 3, row: 3, head: "Needs you",
    body: (
      <>
        <p>A soft rule is over, for example the item costs more than your limit.</p>
        <p>Approve or decline in the chat, with your passkey if you added one. Approving signs the exact cart, so the agent can&rsquo;t change it afterwards.</p>
      </>
    ) },
  { k: "saved", icon: "bolt", title: "Saved PayPal", sub: "PayPal connected", tone: "live", chip: "✓ Paid now", isNew: true, col: 1, row: 4, right: true, head: "PayPal connected",
    body: <p>Mandate charges your saved PayPal wallet straight away. No trip to PayPal.</p> },
  { k: "executor", icon: "cog", title: "Payment step", sub: "Only part that holds PayPal", tone: "live", chip: "✓ Permit", col: 2, row: 4, right: true, down: true, head: "Payment step",
    body: (
      <>
        <p>Every rule passes, or you approved. Mandate signs a one-time permit for this exact cart and price, and only then does the payment step use PayPal.</p>
        <p>The permit can&rsquo;t be used twice, and a changed cart doesn&rsquo;t match it.</p>
      </>
    ) },
  { k: "approve", icon: "out", title: "Approve in PayPal", sub: "PayPal not connected", tone: "ask", chip: "Each time", col: 3, row: 4, head: "Not connected",
    body: (
      <ol className="mm-steps">
        <li>The chat shows &ldquo;Approve in PayPal&rdquo;.</li>
        <li>You log in with PayPal and approve.</li>
        <li>Mandate captures the payment when you come back.</li>
      </ol>
    ) },
  { k: "dispute", icon: "flag", title: "Disputes", sub: "AI-drafted, with evidence", tone: "you", chip: "You confirm", col: 1, row: 5, right: true, head: "Delivery and disputes",
    body: (
      <>
        <p>Orders show tracking. If a parcel is lost, it&rsquo;s flagged on the Orders page.</p>
        <p>The AI drafts a dispute with the signed evidence attached. You edit it and confirm before it&rsquo;s filed with PayPal.</p>
      </>
    ) },
  { k: "receipts", icon: "chain", title: "Receipt log", sub: "Signed, hash-chained", tone: "live", chip: "✓ Verified", col: 2, row: 5, right: true, head: "Paid, counted and logged",
    body: (
      <>
        <p>The payment, the permit and the AP2 cart and payment mandates are written to a signed, hash-chained receipt log, and the amount is counted against your budget.</p>
        <p>Edit one receipt and the check fails on the Receipts page.</p>
      </>
    ) },
  { k: "seller", icon: "search", title: "Seller check", sub: "Matches PayPal's record", tone: "live", chip: "✓ AP2", col: 3, row: 5, head: "Seller check",
    body: <p>A seller pastes the PayPal order id and sees your signed consent, the cart, and PayPal&rsquo;s own record of the payment, all matched.</p> },
];

const CONTROLS: Card[] = [
  { k: "pause", icon: "pause", title: "Pause or revoke", sub: "One click", tone: "you", chip: "You", head: "Pause or revoke",
    body: <p>One click stops the agent. A revoked mandate can&rsquo;t be turned back on.</p> },
  { k: "kill", icon: "zap", title: "Kill switch", sub: "Zapier automation", tone: "block", chip: "Stops", head: "Kill switch",
    body: <p>A Zapier automation (for example, text STOP) can pause every agent. It can stop spending, never approve it.</p> },
  { k: "mcp", icon: "plug", title: "Other assistants", sub: "Connected over MCP", tone: "live", chip: "Same gate", head: "Same gate, over MCP",
    body: <p>Connect another assistant with a private link. It buys through the same 7 rules, and you can cut it off at any time.</p> },
  { k: "signout", icon: "exit", title: "Sign out", sub: "Ends this workspace", tone: "you", chip: "You", isNew: true, head: "Sign out",
    body: <p>Ends your private workspace on this browser: agents paused, PayPal disconnected, assistants cut off. Receipts stay verifiable.</p> },
];

const ALL = [...SETUP, ...PURCHASE, ...CONTROLS];

export function MandateMap() {
  const [open, setOpen] = useState<string | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number; side: "top" | "bottom" } | null>(null);
  const tip = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const btns = useRef(new Map<string, HTMLButtonElement>());
  const card = open ? ALL.find((c) => c.k === open) : undefined;

  const close = useCallback((refocus = false) => {
    setOpen((k) => {
      if (refocus && k) btns.current.get(k)?.focus();
      return null;
    });
    setPos(null);
  }, []);

  // Place the popover above its card (below if there's no room), pointing at it.
  useLayoutEffect(() => {
    if (!open || !tip.current || !root.current) return;
    const b = btns.current.get(open)!.getBoundingClientRect();
    const box = root.current.getBoundingClientRect();
    const w = tip.current.offsetWidth;
    const h = tip.current.offsetHeight;
    const vw = document.documentElement.clientWidth;
    const leftVp = Math.min(Math.max(16, b.left + b.width / 2 - w / 2), vw - w - 16);
    const above = b.top - h - 12 >= 72; // clear of the sticky header
    setPos({
      left: leftVp - box.left,
      top: (above ? b.top - h - 12 : b.bottom + 12) - box.top,
      arrow: Math.min(Math.max(14, b.left + b.width / 2 - leftVp), w - 14),
      side: above ? "top" : "bottom",
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      const t = e.target as Node;
      if (tip.current?.contains(t) || btns.current.get(open)?.contains(t)) return;
      close();
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close(true);
    const resize = () => close();
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    window.addEventListener("resize", resize);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
      window.removeEventListener("resize", resize);
    };
  }, [open, close]);

  const renderCard = (c: Card) => (
    <button
      key={c.k}
      ref={(el) => {
        if (el) btns.current.set(c.k, el);
      }}
      type="button"
      className={`mm-card${c.right ? " to-r" : ""}${c.down ? " to-d" : ""}`}
      style={c.col ? { gridColumn: c.col, gridRow: c.row } : undefined}
      aria-expanded={open === c.k}
      aria-controls={open === c.k ? "mm-tip" : undefined}
      onClick={() => (open === c.k ? close() : setOpen(c.k))}
    >
      {c.isNew && <span className="mm-new">New</span>}
      <span className="mm-ic" aria-hidden="true">
        <svg>
          <use href={`#mm-${c.icon}`} />
        </svg>
      </span>
      <span className="mm-t">{c.title}</span>
      <span className={`mm-chip ${c.tone}`}>{c.chip}</span>
      <span className="mm-s">{c.sub}</span>
    </button>
  );

  const board = (id: string, name: string, cards: Card[], four = false) => (
    <section className="mm-board" aria-labelledby={id}>
      <div className="mm-crumb">
        <svg aria-hidden="true">
          <use href="#mm-org" />
        </svg>
        Mandate <span className="mm-sep">›</span>
        <svg aria-hidden="true">
          <use href="#mm-hex" />
        </svg>
        <b id={id}>{name}</b>
      </div>
      <div className={`mm-grid${four ? " four" : ""}`}>{cards.map(renderCard)}</div>
    </section>
  );

  return (
    <div className="mm-root" ref={root}>
      <Sprite />
      <header className="mm-head">
        <h1>Mandate Map</h1>
        <p>You set the rules once. Your agent shops. Every purchase passes a policy gate before any money moves, and every step lands in a signed log. Click any card for the details.</p>
      </header>
      <div className="mm-legend" aria-label="What the labels mean">
        <span className="mm-chip you">You</span> you do this
        <span className="mm-chip live">✓ Allowed</span> goes ahead
        <span className="mm-chip ask">Asks you</span> waits for you
        <span className="mm-chip block">✕ Blocks</span> stops it
        <span className="mm-chip opt">Optional</span>
      </div>
      {board("mm-b1", "Set up · once", SETUP)}
      {board("mm-b2", "Every purchase", PURCHASE)}
      {board("mm-b3", "Always in your control", CONTROLS, true)}
      <p className="mm-hint">Runs on the PayPal sandbox. No real money moves.</p>

      {card && (
        <div
          ref={tip}
          id="mm-tip"
          className="mm-tip"
          role="dialog"
          aria-label={card.head}
          data-side={pos?.side ?? "top"}
          style={{ left: pos?.left ?? 0, top: pos?.top ?? 0, visibility: pos ? "visible" : "hidden", ["--arrow" as string]: `${pos?.arrow ?? 150}px` }}
        >
          <div className="mm-tip-head">
            <b>{card.head}</b>
            <span className={`mm-chip ${card.tone}`}>{card.chip}</span>
          </div>
          {card.body}
        </div>
      )}
    </div>
  );
}

/** Line icons, drawn once and reused by id. */
function Sprite() {
  const sym = (id: string, d: ReactNode) => (
    <symbol id={`mm-${id}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </symbol>
  );
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {sym("pen", <><path d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></>)}
        {sym("list", <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle cx="4.5" cy="12" r="1" /><circle cx="4.5" cy="18" r="1" /></>)}
        {sym("seal", <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>)}
        {sym("wallet", <><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M16 12.5h2.5" /><path d="M6 6l9-3 1 3" /></>)}
        {sym("key", <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></>)}
        {sym("chat", <path d="M4 5h16v11H9l-5 4V5z" />)}
        {sym("globe", <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z" /></>)}
        {sym("bot", <><rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 4v4M9 13h.01M15 13h.01" /></>)}
        {sym("box", <><path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5v-9z" /><path d="M3 7.5l9 4.5 9-4.5M12 12v9" /></>)}
        {sym("gate", <><path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6l7-3z" /><path d="M9 10h6M9 13h6M9 16h4" /></>)}
        {sym("x", <><circle cx="12" cy="12" r="9" /><path d="M9 9l6 6M15 9l-6 6" /></>)}
        {sym("hand", <><circle cx="9" cy="8" r="4" /><path d="M2 21c0-3.9 3.1-7 7-7 1.5 0 2.9.5 4 1.2" /><path d="M15 18l2 2 4-4" /></>)}
        {sym("bolt", <path d="M13 3L5 14h6l-1 7 8-11h-6l1-7z" />)}
        {sym("cog", <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></>)}
        {sym("out", <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>)}
        {sym("chain", <><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></>)}
        {sym("flag", <path d="M5 21V4h11l-2 4 2 4H5" />)}
        {sym("search", <><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.3-4.3M8.5 11l1.8 1.8 3.2-3.3" /></>)}
        {sym("pause", <><circle cx="12" cy="12" r="9" /><path d="M10 9v6M14 9v6" /></>)}
        {sym("zap", <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 8h8l-8 8h8" /></>)}
        {sym("plug", <path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0V8zM12 17v4" />)}
        {sym("exit", <><path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4M6 12h10" /></>)}
        {sym("org", <><circle cx="8" cy="9" r="3" /><circle cx="16" cy="9" r="3" /><circle cx="12" cy="16" r="3" /></>)}
        <symbol id="mm-hex" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 2">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        </symbol>
      </defs>
    </svg>
  );
}
