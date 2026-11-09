import type { MandateStore } from "../core/stores";
import type { Receipt } from "../gate/receipts";
import { DEMO_USER } from "../server/demo";
import type { AlertChannels, AlertStore } from "./channels";
import { EVENT_TITLE, eventFor, type AutomationEvent } from "./events";
import type { Button, TelegramBot } from "./telegram";

const ICON: Record<AutomationEvent["event"], string> = {
  "approval.needed": "🟡",
  "purchase.blocked": "⛔",
  "purchase.paid": "✅",
  "payment.failed": "⚠️",
  "mandate.status_changed": "⏸️",
};

/** "Mandate: Blocked: …" → "…": the heading already says what happened. */
const body = (e: AutomationEvent) => e.message.replace(/^Mandate:\s*/, "").replace(/^(Blocked|Allowed|Approve):\s*/, "");

/** Sends each workspace's alerts to the channels that workspace connected. Never throws. */
export class AlertRouter {
  private fetchImpl: typeof fetch;
  constructor(
    private o: {
      store: AlertStore;
      mandates: MandateStore;
      appUrl: string;
      telegram: TelegramBot | null;
      fetch?: typeof fetch;
      onError?: (e: unknown) => void;
    },
  ) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  async route(r: Receipt): Promise<number> {
    const e = eventFor(r, this.o.appUrl);
    if (!e) return 0;
    const m = await this.o.mandates.get(r.mandateId);
    if (!m || m.userId === DEMO_USER) return 0;
    const ch = await this.o.store.get(m.userId);
    return ch ? this.send(ch, e) : 0;
  }

  /** Deliver one event to every connected channel; resolves to how many accepted it. */
  async send(ch: AlertChannels, e: AutomationEvent): Promise<number> {
    const jobs: Array<Promise<unknown>> = [];
    const title = `${ICON[e.event]} ${EVENT_TITLE[e.event]}`;
    const text = `${title}\n${body(e)}`;
    if (ch.telegram && this.o.telegram) jobs.push(this.o.telegram.send(ch.telegram.chatId, text, this.buttons(e)));
    if (ch.slack) jobs.push(this.post(ch.slack, { text: `*${title}*\n${body(e)}\n<${e.link}|Open Mandate>` }));
    if (ch.discord) jobs.push(this.post(ch.discord, { content: `**${title}**\n${body(e)}\n${e.link}`, allowed_mentions: { parse: [] } }));
    if (ch.zapier) jobs.push(this.post(ch.zapier, e));
    const done = await Promise.allSettled(jobs);
    for (const d of done) if (d.status === "rejected") this.o.onError?.(d.reason);
    return done.filter((d) => d.status === "fulfilled").length;
  }

  private buttons(e: AutomationEvent): Button[][] {
    const rows: Button[][] = [];
    if (e.event === "approval.needed" && e.approvalId)
      rows.push([
        { text: "✓ Approve", callback_data: `a:${e.approvalId}` },
        { text: "✕ Decline", callback_data: `d:${e.approvalId}` },
      ]);
    // Telegram only accepts public https links.
    if (/^https:\/\//.test(e.link)) rows.push([{ text: e.event === "purchase.paid" ? "Check this payment" : "Open Mandate", url: e.link }]);
    return rows;
  }

  private async post(url: string, payload: unknown) {
    const res = await this.fetchImpl(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(6_000) });
    if (!res.ok) throw new Error(`Alert webhook answered ${res.status}`);
  }
}
