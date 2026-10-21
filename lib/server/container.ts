import { PayPalAgentToolkit } from "@paypal/agent-toolkit/ai-sdk";
import { AnthropicClient } from "../agent/anthropic";
import { OfflinePlanner } from "../agent/offline";
import type { LlmClient } from "../agent/runtime";
import { Executor } from "../core/executor";
import { Governor } from "../core/governor";
import { MemoryPaymentStore } from "../core/spend";
import { MemoryApprovalStore, MemoryMandateStore } from "../core/stores";
import { generateSigner, signerFromPem, type Signer } from "../gate/keys";
import { MemoryPermitStore } from "../gate/permits";
import { ReceiptLog } from "../gate/receipts";
import { DEMO_CATALOG, Catalog } from "../merchant/catalog";
import { FakeProvider } from "../paypal/fake-provider";
import type { PaymentProvider } from "../paypal/provider";
import { ToolkitProvider, type ToolkitTools } from "../paypal/toolkit-provider";

export type Env = Record<string, string | undefined>;

export interface Container {
  governor: Governor;
  executor: Executor;
  receipts: ReceiptLog;
  mandates: MemoryMandateStore;
  approvals: MemoryApprovalStore;
  payments: MemoryPaymentStore;
  catalog: Catalog;
  signer: Signer;
  /** A fresh model client per agent run (the offline planner is stateful). */
  newLlm: (opts?: { drill?: boolean }) => LlmClient;
  providerName: string;
  modelName: string;
  signingKey: "configured" | "ephemeral";
  appUrl: string;
}

function makeProvider(env: Env): PaymentProvider {
  if (env.PAYPAL_CLIENT_ID && env.PAYPAL_CLIENT_SECRET) {
    if ((env.PAYPAL_ENVIRONMENT ?? "SANDBOX").toUpperCase() !== "SANDBOX")
      throw new Error("Mandate runs against the PayPal sandbox only. Set PAYPAL_ENVIRONMENT=SANDBOX.");
    const toolkit = new PayPalAgentToolkit({
      clientId: env.PAYPAL_CLIENT_ID,
      clientSecret: env.PAYPAL_CLIENT_SECRET,
      configuration: { actions: { orders: { create: true, get: true, capture: true } }, context: { sandbox: true } },
    });
    return new ToolkitProvider(toolkit.getTools() as unknown as ToolkitTools);
  }
  return new FakeProvider(env.MANDATE_SIMULATED_MODE === "payer_action" ? "payer_action" : "auto_complete");
}

export function createContainer(env: Env = process.env): Container {
  const appUrl = (env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const signer = env.MANDATE_SIGNING_KEY ? signerFromPem(env.MANDATE_SIGNING_KEY.replace(/\\n/g, "\n")) : generateSigner();
  const provider = makeProvider(env);
  const clock = () => new Date();

  const permits = new MemoryPermitStore();
  const payments = new MemoryPaymentStore();
  const receipts = new ReceiptLog(signer, clock);
  const mandates = new MemoryMandateStore();
  const approvals = new MemoryApprovalStore();
  const executor = new Executor({
    provider,
    permits,
    payments,
    receipts,
    publicKey: signer.publicKey,
    clock,
    urls: { returnUrl: `${appUrl}/api/paypal/return`, cancelUrl: `${appUrl}/api/paypal/cancel` },
  });
  const governor = new Governor({ mandates, approvals, permits, payments, receipts, executor, signer, clock });

  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.MANDATE_MODEL ?? "claude-sonnet-5-5";
  const newLlm = (opts?: { drill?: boolean }): LlmClient => {
    // The drill simulates a compromised agent that obeys product pages, so the
    // injection defence can be shown reliably whatever the real model would do.
    if (opts?.drill) return new OfflinePlanner({ followPageInstructions: true });
    return apiKey ? new AnthropicClient({ apiKey, model }) : new OfflinePlanner();
  };

  return {
    governor,
    executor,
    receipts,
    mandates,
    approvals,
    payments,
    catalog: new Catalog(DEMO_CATALOG),
    signer,
    newLlm,
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
