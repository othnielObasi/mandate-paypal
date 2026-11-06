import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { policySchema, type Policy } from "./policy.js";

export type CreateMandateRequest = {
  /** The rules in plain English */
  text: string;
  /** The signed rules. Money is in minor units (cents). */
  policy?: Policy;
};

export const createMandateRequestSchema: Schema<CreateMandateRequest> = s.object<CreateMandateRequest>({
  text: s.string(),
  policy: s.optional(s.lazy(() => policySchema)),
});
