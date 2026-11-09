"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Alert, Bell, Box, Chart, Check, Cross, Home, Mark, Pause, Plug, Receipt } from "../components/icons";
import { EVENT_TITLE, type AutomationEvent } from "@/lib/alerts/events";
import { useNotifications } from "./notifications/useNotifications";
import { useStore } from "./store";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/orders", label: "Orders", icon: Box },
  { href: "/app/assistants", label: "Assistants", icon: Plug },
  { href: "/app/receipts", label: "Receipts", icon: Receipt },
  { href: "/app/insights", label: "Insights", icon: Chart },
  { href: "/app/notifications", label: "Notifications", short: "Alerts", icon: Bell },
] as const;

const TONE: Record<AutomationEvent["event"], "ask" | "block" | "allow" | "plain"> = {
  "approval.needed": "ask",
  "purchase.blocked": "block",
  "purchase.paid": "allow",
  "payment.failed": "block",
  "mandate.status_changed": "plain",
};
const TONE_ICON = { ask: Alert, block: Cross, allow: Check, plain: Pause } as const;

/**
 * Pops up when something new happens that you didn't just watch in the chat: an outside assistant's
 * purchase, PayPal confirming a payment, an approval from Telegram. Stays quiet while the agent runs.
 */
function LiveToast() {
  const { ready, busy, mandate } = useStore();
  const { items } = useNotifications();
  const [show, setShow] = useState<AutomationEvent | null>(null);
  const base = useRef<{ id: string; seq: number } | null>(null);
  const quietUntil = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (busy) quietUntil.current = Date.now() + 5000;
  }, [busy]);

  useEffect(() => {
    if (!ready || !mandate) return;
    const top = items[0]?.receipt.seq ?? 0;
    // Start from what is already there: only later events pop up.
    if (!base.current || base.current.id !== mandate.id) {
      base.current = { id: mandate.id, seq: top };
      return;
    }
    if (top <= base.current.seq) return;
    const fresh = items.find((e) => e.receipt.seq > base.current!.seq);
    base.current.seq = top;
    if (!fresh || busy || Date.now() < quietUntil.current) return;
    setShow(fresh);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(null), 8000);
  }, [items, ready, mandate, busy]);

  useEffect(() => () => clearTimeout(timer.current), []);
  if (!show) return null;
  const tone = TONE[show.event];
  const Icon = TONE_ICON[tone];
  const go = show.event === "approval.needed" ? { href: "/app", label: "Review" } : { href: "/app/notifications", label: "View" };
  return (
    <div className={`live-toast notif-${tone}`} role="status" aria-live="polite">
      <span className="notif-ic" aria-hidden="true">
        <Icon size={16} />
      </span>
      <span className="notif-body">
        <span className="notif-title">{EVENT_TITLE[show.event]}</span>
        <span className="notif-text live-toast-text">{show.message.replace(/^Mandate:\s*/, "").replace(/^(Blocked|Approve):\s*/, "")}</span>
      </span>
      <span className="live-toast-actions">
        <NextLink className="btn btn-sm" href={go.href} onClick={() => setShow(null)}>
          {go.label}
        </NextLink>
        <button type="button" className="live-toast-x" aria-label="Dismiss" onClick={() => setShow(null)}>
          ✕
        </button>
      </span>
    </div>
  );
}

/** Your workspace: PayPal connection and sign out. */
function AccountMenu() {
  const { wallet, connectWallet, disconnectWallet, signOut, busy } = useStore();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !box.current?.contains(e.target as Node) && close();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (close(), btn.current?.focus());
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  const close = () => (setOpen(false), setConfirm(false));

  return (
    <div className="acct" ref={box}>
      <button ref={btn} type="button" className="avatar" aria-label="Your workspace" aria-expanded={open} aria-controls="acct-menu" onClick={() => (open ? close() : setOpen(true))}>
        Y
      </button>
      {open && (
        <div id="acct-menu" className="acct-menu" role="group" aria-label="Your workspace">
          <div className="acct-head">
            <strong>Your workspace</strong>
            <span className="small muted">Private to this browser</span>
          </div>
          {wallet?.available && (
            <div className="acct-row">
              <span className="grow">
                <span className="acct-label">PayPal</span>
                <span className="small muted">{wallet.connected ? (wallet.email ?? "Connected") : "Not connected"}</span>
              </span>
              {wallet.connected ? (
                <button type="button" className="btn btn-sm btn-ghost" onClick={disconnectWallet} disabled={busy}>
                  Disconnect
                </button>
              ) : (
                <button type="button" className="btn btn-sm" onClick={connectWallet} disabled={busy}>
                  Connect
                </button>
              )}
            </div>
          )}
          {confirm ? (
            <div className="acct-confirm" role="alert">
              <p className="small">Signing out ends this workspace on this browser. Your agents are paused and PayPal is disconnected. Receipts stay verifiable.</p>
              <div className="row" style={{ gap: 8 }}>
                <button type="button" className="btn btn-sm btn-ghost" onClick={() => setConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-sm btn-danger" onClick={signOut} disabled={busy}>
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="acct-signout" onClick={() => setConfirm(true)}>
              Sign out
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { health, approvals, orders, error, clearError } = useStore();
  const { unread } = useNotifications();
  const setup = path.startsWith("/app/setup");
  const problems = orders.filter((o) => o.problem && o.dispute?.status !== "filed" && o.dispute?.status !== "open").length;
  const count = (href: string) => (href === "/app" ? approvals.length : href === "/app/orders" ? problems : href === "/app/notifications" ? unread : 0);
  const current = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const live = health && health.provider !== "simulated";

  // Insights' dashboard library is large. Fetch it while the browser is idle so the tab opens fast.
  useEffect(() => {
    const warm = () => void import("./insights/Dashboard").catch(() => undefined);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(warm, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(warm, 2500);
    return () => clearTimeout(id);
  }, []);

  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="appbar">
        <div className="wrap appbar-in">
          <NextLink href="/" className="brand" aria-label="Mandate home page">
            <Mark />
            Mandate
          </NextLink>
          {!setup && (
            <nav className="nav" aria-label="Main">
              {NAV.map((n) => (
                <NextLink key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined}>
                  {n.label}
                  {count(n.href) > 0 && <span className="count" aria-label={`${count(n.href)} need you`}>{count(n.href)}</span>}
                </NextLink>
              ))}
            </nav>
          )}
          <div className="appbar-end">
            {health && (
              <span className={`chip env ${live ? "chip-accent" : ""}`} title={`Agent: ${health.model}. Market prices: ${health.market}.`}>
                <span className="dot" />
                {live ? "PayPal sandbox" : "Demo payments"}
              </span>
            )}
            {!setup && (
              <NextLink href="/seller" className="small seller-link">
                Seller view
              </NextLink>
            )}
            <AccountMenu />
          </div>
        </div>
      </header>

      <main id="main" className="wrap page">
        {error && (
          <div className="banner banner-block" role="alert" style={{ marginBottom: 20 }}>
            <span className="grow">{error}</span>
            <button className="btn btn-sm btn-ghost" onClick={clearError}>
              Dismiss
            </button>
          </div>
        )}
        {/* Fades each page in on navigation. Opacity only: a transform here would trap fixed-position dialogs. */}
        <div key={path} className="page-in">
          {children}
        </div>
      </main>

      {!setup && (
        <nav className="tabbar" aria-label="Main">
          {NAV.map((n) => (
            <NextLink key={n.href} href={n.href} aria-current={current(n.href) ? "page" : undefined}>
              <n.icon size={22} />
              {"short" in n ? n.short : n.label}
              {count(n.href) > 0 && <span className="count">{count(n.href)}</span>}
            </NextLink>
          ))}
        </nav>
      )}
      {!setup && !path.startsWith("/app/notifications") && <LiveToast />}
    </>
  );
}
