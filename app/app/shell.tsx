"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { Box, Home, Mark, Plug, Receipt } from "../components/icons";
import { useStore } from "./store";

const NAV = [
  { href: "/app", label: "Home", icon: Home },
  { href: "/app/orders", label: "Orders", icon: Box },
  { href: "/app/assistants", label: "Assistants", icon: Plug },
  { href: "/app/receipts", label: "Receipts", icon: Receipt },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { health, approvals, orders, error, clearError } = useStore();
  const setup = path.startsWith("/app/setup");
  const problems = orders.filter((o) => o.problem && o.dispute?.status !== "filed" && o.dispute?.status !== "open").length;
  const count = (href: string) => (href === "/app" ? approvals.length : href === "/app/orders" ? problems : 0);
  const current = (href: string) => (href === "/app" ? path === "/app" : path.startsWith(href));
  const live = health && health.provider !== "simulated";

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
            <span className="avatar" role="img" aria-label="Signed in as the demo user">
              D
            </span>
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
        {children}
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
