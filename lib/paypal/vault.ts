import { randomBytes, randomUUID } from "node:crypto";
import { orderTotalMinor, type OrderSpec } from "../gate/canonical";
import type { FakeProvider } from "./fake-provider";
import { PaymentError, type CreateResult } from "./provider";
import { PAYPAL_SANDBOX_API, type PayPalAuth } from "./webhook-verifier";

/** A user's saved PayPal wallet: a PayPal Vault payment token. We never see their login or card. */
export interface WalletRecord {
  userId: string;
  paymentTokenId: string;
  customerId: string | null;
  email: string | null;
  connectedAt: string;
}

export interface WalletStore {
  get(userId: string): Promise<WalletRecord | undefined>;
  put(r: WalletRecord): Promise<void>;
  /** Removes and returns the wallet, if any. */
  remove(userId: string): Promise<WalletRecord | undefined>;
  /** Remembers who started a PayPal approval, so only they can finish it. */
  putSetup(setupTokenId: string, userId: string): Promise<void>;
  /** One use: returns the user who started it and forgets it. */
  takeSetup(setupTokenId: string): Promise<string | undefined>;
}

export class MemoryWalletStore implements WalletStore {
  private wallets = new Map<string, WalletRecord>();
  private setups = new Map<string, string>();
  async get(userId: string) {
    const w = this.wallets.get(userId);
    return w && structuredClone(w);
  }
  async put(r: WalletRecord) {
    this.wallets.set(r.userId, structuredClone(r));
  }
  async remove(userId: string) {
    const w = this.wallets.get(userId);
    this.wallets.delete(userId);
    return w;
  }
  async putSetup(id: string, userId: string) {
    this.setups.set(id, userId);
  }
  async takeSetup(id: string) {
    const u = this.setups.get(id);
    this.setups.delete(id);
    return u;
  }
}

export interface ReturnUrls {
  returnUrl: string;
  cancelUrl: string;
}

/** Saves a PayPal wallet once, then pays with it without sending the buyer to PayPal each time. */
export interface Vault {
  readonly name: string;
  /** Step 1: a PayPal page where the buyer agrees to save PayPal for this app. */
  startSetup(urls: ReturnUrls): Promise<{ setupTokenId: string; approveUrl: string }>;
  /** Step 2, after the buyer agrees: swap the setup token for a reusable payment token. */
  finishSetup(setupTokenId: string): Promise<{ paymentTokenId: string; customerId: string | null; email: string | null }>;
  /** Delete the saved wallet at PayPal. */
  remove(paymentTokenId: string): Promise<void>;
  /** Create and capture an order paid from the saved wallet. */
  pay(order: OrderSpec, paymentTokenId: string, meta?: { note?: string }): Promise<CreateResult>;
}

const decimal = (minor: number) => (minor / 100).toFixed(2);

/** PayPal Vault v3 + Orders v2 over REST (the Agent Toolkit has no Vault support). Sandbox only. */
export class RestVault implements Vault {
  readonly name = "paypal-vault";
  private fetchImpl: typeof fetch;
  constructor(private o: { auth: PayPalAuth; brand?: string; fetch?: typeof fetch }) {
    this.fetchImpl = o.fetch ?? fetch;
  }

  private async call(method: string, path: string, body?: unknown): Promise<Record<string, unknown>> {
    const res = await this.fetchImpl(`${PAYPAL_SANDBOX_API}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${await this.o.auth.token()}`,
        "content-type": "application/json",
        "paypal-request-id": randomUUID(),
        prefer: "return=representation",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 204) return {};
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const details = (json.details as Array<{ issue?: string; description?: string }> | undefined)?.[0];
      throw new PaymentError(`PayPal ${method} ${path.split("?")[0]} failed (${res.status}${details?.issue ? ` ${details.issue}` : json.name ? ` ${String(json.name)}` : ""})`, json);
    }
    return json;
  }

  async startSetup(urls: ReturnUrls) {
    const res = await this.call("POST", "/v3/vault/setup-tokens", {
      payment_source: {
        paypal: {
          usage_type: "MERCHANT",
          usage_pattern: "UNSCHEDULED_PREPAID",
          description: "Pays for purchases your Mandate rules allow",
          experience_context: { brand_name: this.o.brand ?? "Mandate", return_url: urls.returnUrl, cancel_url: urls.cancelUrl, shipping_preference: "NO_SHIPPING" },
        },
      },
    });
    const id = typeof res.id === "string" ? res.id : null;
    const link = (res.links as Array<{ rel?: string; href?: string }> | undefined)?.find((l) => l.rel === "approve")?.href;
    if (!id || !link) throw new PaymentError("PayPal did not return an approval link for saving PayPal.", res);
    return { setupTokenId: id, approveUrl: link };
  }

  async finishSetup(setupTokenId: string) {
    const res = await this.call("POST", "/v3/vault/payment-tokens", { payment_source: { token: { id: setupTokenId, type: "SETUP_TOKEN" } } });
    const id = typeof res.id === "string" ? res.id : null;
    if (!id) throw new PaymentError("PayPal did not return a payment token.", res);
    const customer = res.customer as { id?: string } | undefined;
    const paypal = (res.payment_source as { paypal?: { email_address?: string } } | undefined)?.paypal;
    return { paymentTokenId: id, customerId: customer?.id ?? null, email: paypal?.email_address ?? null };
  }

  async remove(paymentTokenId: string) {
    await this.call("DELETE", `/v3/vault/payment-tokens/${encodeURIComponent(paymentTokenId)}`);
  }

  async pay(order: OrderSpec, paymentTokenId: string, meta: { note?: string } = {}): Promise<CreateResult> {
    const total = orderTotalMinor(order);
    const res = await this.call("POST", "/v2/checkout/orders", {
      intent: "CAPTURE",
      purchase_units: [
        {
          amount: { currency_code: order.currency, value: decimal(total), breakdown: { item_total: { currency_code: order.currency, value: decimal(total) } } },
          items: order.items.map((i, n) => ({
            name: i.title.slice(0, 127),
            sku: i.sku.slice(0, 127),
            quantity: String(i.qty),
            unit_amount: { currency_code: order.currency, value: decimal(i.unitMinor) },
            // Same place the Agent Toolkit puts it, so the seller check reads it back the same way.
            ...(n === 0 && meta.note ? { description: meta.note.slice(0, 127) } : {}),
          })),
        },
      ],
      payment_source: { paypal: { vault_id: paymentTokenId } },
    });
    const id = typeof res.id === "string" ? res.id : null;
    if (!id) throw new PaymentError("PayPal did not return an order id.", res);
    const capture = (res.purchase_units as Array<{ payments?: { captures?: Array<{ id?: string; status?: string }> } }> | undefined)?.[0]?.payments?.captures?.[0];
    if (res.status === "COMPLETED" && capture?.id) {
      if (capture.status && !["COMPLETED", "PENDING"].includes(capture.status)) throw new PaymentError(`PayPal declined the saved wallet (${capture.status}).`, res);
      return { paypalOrderId: id, status: "COMPLETED", captureId: capture.id };
    }
    if (res.status === "CREATED" || res.status === "APPROVED") return { paypalOrderId: id, status: res.status };
    throw new PaymentError(`PayPal could not charge the saved wallet (${String(res.status)}).`, res);
  }
}

/** Stand-in for tests and the no-credentials demo. Approval returns straight to the app. */
export class SimulatedVault implements Vault {
  readonly name = "simulated-vault";
  private tokens = new Set<string>();
  private setups = new Set<string>();
  constructor(private fake: FakeProvider) {}

  async startSetup(urls: ReturnUrls) {
    const id = `SIMSETUP-${randomBytes(6).toString("hex").toUpperCase()}`;
    this.setups.add(id);
    const u = new URL(urls.returnUrl);
    u.searchParams.set("approval_token_id", id);
    return { setupTokenId: id, approveUrl: u.toString() };
  }

  async finishSetup(setupTokenId: string) {
    if (!this.setups.delete(setupTokenId)) throw new PaymentError("Unknown setup token");
    const id = `SIMTOKEN-${randomBytes(6).toString("hex").toUpperCase()}`;
    this.tokens.add(id);
    return { paymentTokenId: id, customerId: "SIMCUSTOMER", email: "buyer@example.com" };
  }

  async remove(paymentTokenId: string) {
    this.tokens.delete(paymentTokenId);
  }

  async pay(order: OrderSpec, paymentTokenId: string, meta: { note?: string } = {}): Promise<CreateResult> {
    if (!this.tokens.has(paymentTokenId)) throw new PaymentError("Saved wallet not found");
    return this.fake.chargeSaved(order, meta);
  }
}
