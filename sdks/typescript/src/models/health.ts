import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { automationStatusSchema, type AutomationStatus } from "./automation-status.js";
import { modelProviderSchema, type ModelProvider } from "./model-provider.js";
import { signingKeySchema, type SigningKey } from "./signing-key.js";
import { storageSchema, type Storage } from "./storage.js";
import { webSchema, type Web } from "./web.js";

export type Health = {
  ok?: boolean;
  /** `paypal-agent-toolkit` with sandbox keys, else `simulated` */
  provider?: string;
  /** Model ID (muse-spark-1.3, claude-sonnet-5-5…), or `offline-planner` */
  model?: string;
  modelProvider?: ModelProvider;
  signingKey?: SigningKey;
  storage?: Storage;
  market?: string;
  /** KERNEL cloud browser, or only the app's own /demo pages */
  web?: Web;
  automation?: AutomationStatus;
  /** Always true. Mandate never moves real money. */
  sandboxOnly?: boolean;
};

export const healthSchema: Schema<Health> = s.object<Health>({
  ok: s.optional(s.boolean()),
  provider: s.optional(s.string()),
  model: s.optional(s.string()),
  modelProvider: s.optional(s.lazy(() => modelProviderSchema)),
  signingKey: s.optional(s.lazy(() => signingKeySchema)),
  storage: s.optional(s.lazy(() => storageSchema)),
  market: s.optional(s.string()),
  web: s.optional(s.lazy(() => webSchema)),
  automation: s.optional(s.lazy(() => automationStatusSchema)),
  sandboxOnly: s.optional(s.boolean()),
});
