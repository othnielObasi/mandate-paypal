import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type RunAgentRequest = {
  mandateId: string;
  task: string;
  /** Compromised-agent drill: a planner that obeys product pages. */
  drill?: boolean;
  /** Stream NDJSON */
  stream?: boolean;
};

export const runAgentRequestSchema: Schema<RunAgentRequest> = s.object<RunAgentRequest>({
  mandateId: s.string(),
  task: s.string(),
  drill: s.optional(s.boolean()),
  stream: s.optional(s.boolean()),
});
