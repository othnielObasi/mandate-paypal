"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Box, Chart, Home, Mark, Plug, Receipt } from "../components/icons";
import { useNotifications } from "./notifications/useNotifications";
import { useStore } from "./store";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/orders", label: "Orders", icon: Box },
  { href: "/app/assistants", label: "Assistants", icon: Plug },
  { href: "/app/receipts", label: "Receipts", icon: Receipt },
  { href: "/app/insights", label: "Insights", icon: Chart },
] as const;

/** Bell with the number of new notifications since you last looked. */
function NotificationBell({ current }: { current: boolean }) {
  const { unread } = useNotifications();
  return (
    <NextLink href="/app/notifications" className="bell" aria-current={current ? "page" : undefined} aria-label={unread ? `Notifications, ${unread} new` : "Notifications"}>
      <Bell size={20} />
      {unread > 0 && <span className="count" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
    </NextLink>
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
  const setup = path.startsWith("/app/setup");
  const problems = orders.filter((o) => o.problem && o.dispute?.status !== "filed" && o.dispute?.status !== "open").length;
  const count = (href: string) => (href === "/app" ? approvals.length : href === "/app/orders" ? problems : 0);
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
            {!setup && <NotificationBell current={path.startsWith("/app/notifications")} />}
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
          {NAV.map(({ href, label, icon: Icon }) => (
            <NextLink key={href} href={href} aria-current={current(href) ? "page" : undefined}>
              <Icon size={22} />
              {label}
              {count(href) > 0 && <span className="count">{count(href)}</span>}
            </NextLink>
          ))}
        </nav>
      )}
    </>
  );
}
