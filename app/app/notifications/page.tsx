"use client";

import { useCallback, useEffect, useState } from "react";
import NextLink from "next/link";
import { EVENT_TITLE, type AutomationEvent } from "@/lib/alerts/events";
import { api, clock, day } from "../../components/api";
import { Alert, Bell, Check, Cross, Pause } from "../../components/icons";
import { useStore } from "../store";
import { useNotifications } from "./useNotifications";

const TONE: Record<AutomationEvent["event"], "ask" | "block" | "allow" | "plain"> = {
  "approval.needed": "ask",
  "purchase.blocked": "block",
  "purchase.paid": "allow",
  "payment.failed": "block",
  "mandate.status_changed": "plain",
};
const ICON = { ask: Alert, block: Cross, allow: Check, plain: Pause } as const;

const text = (e: AutomationEvent) => e.message.replace(/^Mandate:\s*/, "").replace(/^(Blocked|Approve):\s*/, "");

function action(e: AutomationEvent): { href: string; label: string; external?: boolean } {
  if (e.event === "approval.needed") return { href: "/app", label: "Review" };
  if (e.event === "purchase.paid" && e.paypalOrderId) return { href: `/api/verify/${encodeURIComponent(e.paypalOrderId)}`, label: "Check payment", external: true };
  if (e.event === "purchase.paid") return { href: "/app/orders", label: "Orders" };
  return { href: "/app", label: "Open" };
}

export default function NotificationsPage() {
  const { mandate } = useStore();
  const { items, markRead } = useNotifications();
  // Opening this page clears the bell.
  useEffect(() => {
    markRead();
  }, [markRead]);

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="page-sub">What needs you, what was blocked and what was paid. Get them on Telegram, Slack, Discord or anywhere through Zapier.</p>
        </div>
      </section>
      <div className="split">
        <section className="card" aria-labelledby="nt-h">
          <h2 id="nt-h" className="section-label" style={{ marginBottom: 8 }}>
            {mandate ? "Latest" : "No mandate yet"}
          </h2>
          {items.length === 0 ? (
            <p className="small">Nothing yet. When your agent needs approval, is blocked or pays, it shows up here.</p>
          ) : (
            <ul className="notif-list" data-testid="notifications">
              {items.map((e) => {
                const tone = TONE[e.event];
                const Icon = ICON[tone];
                const a = action(e);
                return (
                  <li key={e.receipt.seq} className={`notif notif-${tone}`}>
                    <span className="notif-ic" aria-hidden="true">
                      <Icon size={16} />
                    </span>
                    <span className="notif-body">
                      <span className="notif-title">
                        {EVENT_TITLE[e.event]}
                      </span>
                      <span className="notif-text">{text(e)}</span>
                      <span className="notif-time">
                        {day(e.at)} · {clock(e.at)} · receipt #{e.receipt.seq}
                      </span>
                    </span>
                    {a.external ? (
                      <a className="btn btn-sm btn-ghost" href={a.href} target="_blank" rel="noopener noreferrer">
                        {a.label}
                      </a>
                    ) : (
                      <NextLink className="btn btn-sm btn-ghost" href={a.href}>
                        {a.label}
                      </NextLink>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
        <aside className="col">
          <AlertChannelsCard />
        </aside>
      </div>
    </>
  );
}

type Channels = { available: boolean; telegram: { enabled: boolean; connected: boolean; name: string | null }; slack: string | null; discord: string | null; zapier: string | null };

const HOOKS: Array<{ id: "slack" | "discord" | "zapier"; name: string; hint: string; placeholder: string }> = [
  { id: "slack", name: "Slack", hint: "An incoming webhook for a channel.", placeholder: "https://hooks.slack.com/services/…" },
  { id: "discord", name: "Discord", hint: "Channel settings → Integrations → Webhooks.", placeholder: "https://discord.com/api/webhooks/…" },
  { id: "zapier", name: "Zapier", hint: "A Catch Hook: then WhatsApp, SMS, email and 7,000+ apps.", placeholder: "https://hooks.zapier.com/hooks/catch/…" },
];

function AlertChannelsCard() {
  const { act, busy, toast } = useStore();
  const [ch, setCh] = useState<Channels | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const load = useCallback(() => api<Channels>("/api/alerts").then(setCh).catch(() => undefined), []);
  useEffect(() => {
    void load();
  }, [load]);

  // After "Connect Telegram", wait for the user to tap Start in Telegram.
  useEffect(() => {
    if (!link || ch?.telegram.connected) return;
    let n = 0;
    const t = setInterval(async () => {
      const next = await api<Channels>("/api/alerts").catch(() => null);
      if (next) setCh(next);
      if (next?.telegram.connected) {
        setLink(null);
        toast("Telegram connected. Alerts will arrive there.");
      }
      if (++n > 60) clearInterval(t);
    }, 3000);
    return () => clearInterval(t);
  }, [link, ch?.telegram.connected, toast]);

  if (!ch) return <section className="card" aria-busy="true" style={{ minHeight: 180 }} />;
  if (!ch.available) return null;
  const post = (body: unknown) => api<{ url?: string; sent?: number }>("/api/alerts", { method: "POST", body: JSON.stringify(body) });
  const any = ch.telegram.connected || ch.slack || ch.discord || ch.zapier;

  return (
    <section className="card" aria-labelledby="ch-h" data-testid="alert-channels">
      <h2 id="ch-h" className="section-label" style={{ marginBottom: 4 }}>
        <Bell size={14} /> Send alerts to
      </h2>
      <p className="small" style={{ marginBottom: 12 }}>
        Only this workspace&rsquo;s alerts go to these.
      </p>

      <div className="chan">
        <div className="chan-head">
          <strong>Telegram</strong>
          {ch.telegram.connected && <span className="chip chip-allow">Connected</span>}
        </div>
        {!ch.telegram.enabled ? (
          <p className="small">Not set up on this server.</p>
        ) : ch.telegram.connected ? (
          <>
            <p className="small">
              Sending to {ch.telegram.name ?? "your Telegram"}. Approve or decline right from the message.
            </p>
            <button className="btn btn-sm btn-ghost" onClick={() => act(async () => (await post({ action: "remove", channel: "telegram" }), await load()))} disabled={busy}>
              Disconnect
            </button>
          </>
        ) : link ? (
          <>
            <a className="btn btn-sm btn-primary" href={link} target="_blank" rel="noopener noreferrer">
              Open Telegram and tap Start
            </a>
            <p className="small mt-8">Waiting for you to tap Start…</p>
          </>
        ) : (
          <>
            <p className="small">Get alerts on your phone, and approve with one tap.</p>
            <button className="btn btn-sm" onClick={() => act(async () => setLink((await post({ action: "telegram_link" })).url ?? null))} disabled={busy}>
              Connect Telegram
            </button>
          </>
        )}
      </div>

      {HOOKS.map((h) => (
        <div className="chan" key={h.id}>
          <div className="chan-head">
            <strong>{h.name}</strong>
            {ch[h.id] && <span className="chip chip-allow">Connected</span>}
          </div>
          {ch[h.id] ? (
            <>
              <p className="small mono-sm">{ch[h.id]}</p>
              <button className="btn btn-sm btn-ghost" onClick={() => act(async () => (await post({ action: "remove", channel: h.id }), await load()))} disabled={busy}>
                Remove
              </button>
            </>
          ) : (
            <form
              className="chan-form"
              onSubmit={(e) => {
                e.preventDefault();
                void act(async () => {
                  await post({ action: "set", channel: h.id, url: draft[h.id] ?? "" });
                  setDraft((d) => ({ ...d, [h.id]: "" }));
                  await load();
                  toast(`${h.name} connected.`);
                });
              }}
            >
              <label className="sr-only" htmlFor={`hook-${h.id}`}>
                {h.name} webhook address
              </label>
              <input id={`hook-${h.id}`} className="input chan-input" type="url" placeholder={h.placeholder} value={draft[h.id] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [h.id]: e.target.value }))} />
              <button className="btn btn-sm" type="submit" disabled={busy || !draft[h.id]}>
                Save
              </button>
              <p className="small chan-hint">{h.hint}</p>
            </form>
          )}
        </div>
      ))}

      {any && (
        <button
          className="btn btn-sm mt-12"
          onClick={() =>
            act(async () => {
              const r = await post({ action: "test" });
              toast(r.sent ? `Test alert sent to ${r.sent} ${r.sent === 1 ? "channel" : "channels"}.` : "Couldn't deliver the test alert. Check the addresses.");
            })
          }
          disabled={busy}
        >
          Send a test alert
        </button>
      )}
    </section>
  );
}
