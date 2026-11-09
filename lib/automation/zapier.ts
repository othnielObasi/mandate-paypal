import { createHash, timingSafeEqual } from "node:crypto";
import type { Receipt } from "../gate/receipts";

/**
 * Zapier automation.
 *
 * Out: every entry in the signed decision log that a person would want to hear about becomes a
 * flat JSON event posted to a Zapier "Catch Hook" (Webhooks by Zapier). The Zap can then text,
 * email or Slack the user. Events carry the receipt's seq and hash, so anyone can match them to
 * the signed log.
 *
 * In: a Zap can pull the kill switch (pause, resume or revoke) with a shared secret.
 * Zapier never sees PayPal credentials and cannot approve a purchase: approvals stay in the app,
 * where a passkey can be required.
 */

import { eventFor, type AutomationEvent } from "../alerts/events";

export { eventFor, type AutomationEvent, type AutomationEventName } from "../alerts/events";

/** Posts events to a Zapier Catch Hook. Never throws and never delays a purchase. */
export class ZapierHook {
  readonly url: URL;
  private fetchImpl: typeof fetch;

  constructor(private o: { url: string; appUrl: string; fetch?: typeof fetch; timeoutMs?: number; onError?: (e: unknown) => void }) {
    const u = new URL(o.url);
    if (u.protocol !== "https:") throw new Error("ZAPIER_HOOK_URL must be an https URL.");
    this.url = u;
    this.fetchImpl = o.fetch ?? fetch;
  }

  /** Map and send; resolves to whether an event was delivered. */
  async notify(r: Receipt): Promise<boolean> {
    const e = eventFor(r, this.o.appUrl);
    if (!e) return false;
    try {
      const res = await this.fetchImpl(this.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(e),
        signal: AbortSignal.timeout(this.o.timeoutMs ?? 5_000),
      });
      if (!res.ok) throw new Error(`Zapier hook answered ${res.status}`);
      return true;
    } catch (err) {
      this.o.onError?.(err);
      return false;
    }
  }
}

const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();

/** Constant-time check of an `Authorization: Bearer <secret>` header. */
export function bearerMatches(header: string | null, secret: string): boolean {
  const m = /^Bearer\s+(.+)$/i.exec(header ?? "");
  if (!m) return false;
  return timingSafeEqual(digest(m[1]!.trim()), digest(secret));
}
