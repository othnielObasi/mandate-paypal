import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { kindSchema, type Kind } from "./kind.js";

export type AgentEvent = {
  kind?: Kind;
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  ok?: boolean;
  /** For propose_purchase, a ProposeResult */
  result?: Record<string, unknown>;
};

export const agentEventSchema: Schema<AgentEvent> = s.object<AgentEvent>({
  kind: s.optional(s.lazy(() => kindSchema)),
  text: s.optional(s.string()),
  name: s.optional(s.string()),
  input: s.optional(s.record(s.string(), s.unknown())),
  ok: s.optional(s.boolean()),
  result: s.optional(s.record(s.string(), s.unknown())),
});
