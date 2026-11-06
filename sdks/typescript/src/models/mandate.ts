import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { policySchema, type Policy } from "./policy.js";
import { statusSchema, type Status } from "./status.js";

export type Mandate = {
  id?: string;
  userId?: string;
  status?: Status;
  rawText?: string;
  createdAt?: Date;
  /** The signed rules. Money is in minor units (cents). */
  policy?: Policy;
};

export const mandateSchema: Schema<Mandate> = s.object<Mandate>({
  id: s.optional(s.string()),
  userId: s.optional(s.string()),
  status: s.optional(s.lazy(() => statusSchema)),
  rawText: s.optional(s.string()),
  createdAt: s.optional(s.dateTime()),
  policy: s.optional(s.lazy(() => policySchema)),
});
