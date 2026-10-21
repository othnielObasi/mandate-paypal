/** Sandbox only: the app refuses to start against production. */
export const PAYPAL_SANDBOX_API = "https://api-m.sandbox.paypal.com";

/** OAuth client-credentials token, cached until shortly before it expires. */
export class PayPalAuth {
  private cached: { token: string; until: number } | null = null;
  private fetchImpl: typeof fetch;

  constructor(private o: { clientId: string; clientSecret: string; fetch?: typeof fetch; clock?: () => number }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  async token(): Promise<string> {
    const now = this.o.clock ? this.o.clock() : Date.now();
    if (this.cached && now < this.cached.until) return this.cached.token;
    const res = await this.fetchImpl(`${PAYPAL_SANDBOX_API}/v1/oauth2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${Buffer.from(`${this.o.clientId}:${this.o.clientSecret}`).toString("base64")}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
      signal: AbortSignal.timeout(15_000),
    });
    const json = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number };
    if (!res.ok || !json.access_token) throw new Error(`PayPal OAuth failed (${res.status})`);
    this.cached = { token: json.access_token, until: now + Math.max(60, (json.expires_in ?? 600) - 60) * 1000 };
    return json.access_token;
  }
}

const REQUIRED = ["paypal-auth-algo", "paypal-cert-url", "paypal-transmission-id", "paypal-transmission-sig", "paypal-transmission-time"] as const;

function isPayPalCertUrl(u: string): boolean {
  try {
    const url = new URL(u);
    return url.protocol === "https:" && (url.hostname === "paypal.com" || url.hostname.endsWith(".paypal.com"));
  } catch {
    return false;
  }
}

/**
 * Verifies a webhook delivery with PayPal's verify-webhook-signature API.
 * Any missing header, foreign certificate URL, network error or non-SUCCESS
 * answer is a rejection (fails closed).
 */
export class PayPalWebhookVerifier {
  private fetchImpl: typeof fetch;
  constructor(private o: { webhookId: string; auth: PayPalAuth; fetch?: typeof fetch }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  async verify(headers: Headers, event: unknown): Promise<boolean> {
    const h = Object.fromEntries(REQUIRED.map((k) => [k, headers.get(k)]));
    if (REQUIRED.some((k) => !h[k])) return false;
    if (!isPayPalCertUrl(h["paypal-cert-url"]!)) return false;
    try {
      const res = await this.fetchImpl(`${PAYPAL_SANDBOX_API}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { authorization: `Bearer ${await this.o.auth.token()}`, "content-type": "application/json" },
        body: JSON.stringify({
          auth_algo: h["paypal-auth-algo"],
          cert_url: h["paypal-cert-url"],
          transmission_id: h["paypal-transmission-id"],
          transmission_sig: h["paypal-transmission-sig"],
          transmission_time: h["paypal-transmission-time"],
          webhook_id: this.o.webhookId,
          webhook_event: event,
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { verification_status?: string };
      return json.verification_status === "SUCCESS";
    } catch {
      return false;
    }
  }
}
