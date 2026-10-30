import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";
import { AnthropicClient } from "../agent/anthropic";
import { OfflinePlanner } from "../agent/offline";
import type { LlmClient } from "../agent/runtime";
import { Pool } from "pg";
import { Executor } from "../core/executor";
import { Governor } from "../core/governor";
import type { PaymentStore } from "../core/spend";
import type { ApprovalStore, MandateStore } from "../core/stores";
import { PgDb, type Sql } from "../db/sql";
import { memoryStores, pgStores, type Stores } from "../db/stores";
import { generateSigner, signerFromPem, type Signer } from "../gate/keys";
import { ReceiptLog } from "../gate/receipts";
import { SimulatedCarrier } from "../fulfilment/carrier";
import { Fulfilment, type DisputeChannel, type TrackingChannel } from "../fulfilment/service";
import { DEMO_CATALOG, Catalog } from "../merchant/catalog";
import { CatalogMerchants, DEMO_MERCHANTS, type Merchants } from "../merchant/merchants";
import { Credentials } from "../ap2/credentials";
import { checkPayment } from "../ap2/check";
import { checkAp2Order } from "../ap2v2/check";
import { Channel3Oracle, SimulatedMarket, type PriceOracle } from "../market/oracle";
import { AgentSession } from "../agent/tools";
import { McpSessions, type McpDeps } from "../mcp/server";
import { SimulatedDisputes, ToolkitDisputes, ToolkitTracking } from "../paypal/toolkit-fulfilment";
import { FakeProvider } from "../paypal/fake-provider";
import type { PaymentProvider } from "../paypal/provider";
import { ToolkitProvider, type ToolkitTools } from "../paypal/toolkit-provider";
import { PayPalAuth, PayPalWebhookVerifier } from "../paypal/webhook-verifier";
import { RateLimiter } from "./rate-limit";
import type { WebhookVerifier } from "./webhooks";

export type Env = Record<string, string | undefined>;

export interface Container {
  /** MCP server for outside AI assistants. */
  mcp: McpDeps;
  governor: Governor;
  executor: Executor;
  fulfilment: Fulfilment;
  receipts: ReceiptLog;
  mandates: MandateStore;
  approvals: ApprovalStore;
  payments: PaymentStore;
  stores: Stores;
  storage: "postgres" | "memory";
  marketName: string;
  /** Null when webhooks are not configured; the route then refuses every delivery. */
  webhookVerifier: WebhookVerifier | null;
  /** Limits routes that call the model, to protect the hosted demo's API budget. */
  limiter: RateLimiter;
  proxyHops: number;
  catalog: Catalog;
  credentials: Credentials;
  merchants: Merchants;
  signer: Signer;
  /** A fresh model client per agent run (the offline planner is stateful). */
  newLlm: (opts?: { drill?: boolean }) => LlmClient;
  providerName: string;
  modelName: string;
  signingKey: "configured" | "ephemeral";
  appUrl: string;
}

function makePayPal(env: Env): { provider: PaymentProvider; tracking: TrackingChannel | null; disputes: DisputeChannel } {
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    if ((env.PAYPAL_ENVIRONMENT ?? "SANDBOX").toUpperCase() !== "SANDBOX")
      throw new Error("Mandate runs against the PayPal sandbox only. Set PAYPAL_ENVIRONMENT=SANDBOX.");
    const toolkit = new PayPalAgentToolkit({
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      configuration: {
        actions: {
          orders: { create: true, get: true, capture: true },
          shipment: { create: true, get: true, update: true },
          disputes: { list: true, get: true },
        },
        context: { sandbox: true },
      },
    });
    const tools = toolkit.getTools() as unknown as ToolkitTools & ConstructorParameters<typeof ToolkitTracking>[0] & ConstructorParameters<typeof ToolkitDisputes>[0];
    return { provider: new ToolkitProvider(tools), tracking: new ToolkitTracking(tools), disputes: new ToolkitDisputes(tools) };
  }
  return {
    provider: new FakeProvider(env.MANDATE_SIMULATED_MODE === "payer_action" ? "payer_action" : "auto_complete"),
    tracking: null,
    disputes: new SimulatedDisputes(),
  };
}

function makeSql(env: Env, given?: Sql): Sql | null {
  if (given) return given;
  if (!env.DATABASE_URL) return null;
  return new Pool({ connectionString: env.DATABASE_URL, max: 5 }) as unknown as Sql;
}

function makeVerifier(env: Env): WebhookVerifier | null {
  if (!(env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET && env.PAYPAL_WEBHOOK_ID)) return null;
  const auth = new PayPalAuth({ clientId: env.PAYPAL_CLIENT_ID, clientSecret: env.PAYPAL_CLIENT_SECRET });
  return new PayPalWebhookVerifier({ webhookId: env.PAYPAL_WEBHOOK_ID, auth });
}

const intEnv = (v: string | undefined, d: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : d;
};

export function createContainer(env: Env = process.env, opts: { sql?: Sql; webhookVerifier?: WebhookVerifier } = {}): Container {
  const appUrl = (env.APP_URL || env.RENDER_EXTERNAL_URL || "http://localhost:3000").replace(/\/$/, "");
  const sql = makeSql(env, opts.sql);
  if (sql && !env.MANDATE_SIGNING_KEY)
    throw new Error("With a database, set MANDATE_SIGNING_KEY so receipts stay verifiable across restarts (see .env.example).");
  const signer = env.MANDATE_SIGNING_KEY ? signerFromPem(env.MANDATE_SIGNING_KEY.replace(/\\n/g, "\n")) : generateSigner();
  const { provider, tracking, disputes } = makePayPal(env);
  const clock = () => new Date();

  const stores = sql ? pgStores(new PgDb(sql)) : memoryStores();
  const { permits, payments, mandates, approvals } = stores;
  const receipts = new ReceiptLog(signer, clock, stores.receipts);
  const fulfilment = new Fulfilment({
    orders: stores.orders,
    disputes: stores.disputes,
    carrier: new SimulatedCarrier(stores.parcels),
    receipts,
    tracking,
    disputeChannel: disputes,
    publicKey: signer.publicKey,
    clock,
    ap2Evidence: async (paypalOrderId) => {
      const v = await checkPayment({ stores, mandates, credentials, merchants, executor }, paypalOrderId, clock());
      if (!v) return null;
      const ap2 = await checkAp2Order({ credentials: stores.credentials, mandates, keys: credentials.ap2 }, paypalOrderId);
      return {
        intent_mandate: v.chain.intent,
        cart_mandate: v.chain.cart,
        payment_mandate: v.chain.payment,
        verification: { ok: v.ok, checks: v.checks },
        // AP2 v0.2 dispute evidence: checkout + payment mandates and receipts, verifiable with /api/ap2/jwks.
        ap2_v0_2: ap2 ? { ...ap2.evidence, ok: ap2.ok, checks: ap2.checks } : null,
      };
    },
  });
  const executor = new Executor({
    provider,
    permits,
    payments,
    receipts,
    publicKey: signer.publicKey,
    clock,
    urls: { returnUrl: `${appUrl}/api/paypal/return`, cancelUrl: `${appUrl}/api/paypal/cancel` },
    onPaid: async (p) => {
      await fulfilment.onPaid(p);
      await governor.recordCapture(p);
    },
    pending: stores.pending,
  });
  const catalog = new Catalog(DEMO_CATALOG);
  const credentials = new Credentials(signer);
  const market: PriceOracle = env.CHANNEL3_API_KEY ? new Channel3Oracle({ apiKey: env.CHANNEL3_API_KEY }) : new SimulatedMarket();
  const merchants = new CatalogMerchants(signer, catalog, DEMO_MERCHANTS);
  const governor = new Governor({
    mandates,
    approvals,
    permits,
    payments,
    receipts,
    executor,
    signer,
    clock,
    credentials,
    merchants,
    credentialStore: stores.credentials,
    market,
  });

  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.MANDATE_MODEL ?? "claude-sonnet-5-5";
  const newLlm = (opts?: { drill?: boolean }): LlmClient => {
    // The drill simulates a compromised agent that obeys product pages, so the
    // injection defence can be shown reliably whatever the real model would do.
    if (opts?.drill) return new OfflinePlanner({ followPageInstructions: true });
    return apiKey ? new AnthropicClient({ apiKey, model }) : new OfflinePlanner();
  };

  const mcp: McpDeps = {
    connections: stores.connections,
    mandates,
    governor,
    catalog,
    appUrl,
    allowedOrigins: [new URL(appUrl).origin, ...(env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean)],
    sessions: new McpSessions((conn) => new AgentSession({ task: "", mandateId: conn.mandateId, catalog, propose: (p) => governor.propose(p), via: conn.label })),
  };

  return {
    mcp,
    governor,
    executor,
    fulfilment,
    receipts,
    mandates,
    approvals,
    payments,
    stores,
    catalog,
    credentials,
    merchants,
    signer,
    newLlm,
    storage: sql ? "postgres" : "memory",
    marketName: market.name,
    webhookVerifier: opts.webhookVerifier ?? makeVerifier(env),
    limiter: new RateLimiter({
      perIp: { limit: intEnv(env.RATE_LIMIT_PER_MINUTE, 10), windowMs: 60_000 },
      global: { limit: intEnv(env.RATE_LIMIT_PER_HOUR, 300), windowMs: 3_600_000 },
    }),
    proxyHops: intEnv(env.TRUSTED_PROXY_HOPS, 1),
    providerName: provider.name,
    modelName: apiKey ? model : "offline-planner",
    signingKey: env.MANDATE_SIGNING_KEY ? "configured" : "ephemeral",
    appUrl,
  };
}

const KEY = Symbol.for("mandate.container");
type G = typeof globalThis & { [KEY]?: Container };

/** One container per server process (survives Next.js dev hot reloads). */
export function getContainer(): Container {
  const g = globalThis as G;
  g[KEY] ??= createContainer();
  return g[KEY];
}

export function setContainer(c: Container) {
  (globalThis as G)[KEY] = c;
}
