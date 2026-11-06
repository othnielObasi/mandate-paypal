import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { agentEventSchema, type AgentEvent } from "./agent-event.js";
import { stoppedBySchema, type StoppedBy } from "./stopped-by.js";

export type AgentRun = {
  final?: string;
  stoppedBy?: StoppedBy;
  events?: AgentEvent[];
};

export const agentRunSchema: Schema<AgentRun> = s.object<AgentRun>({
  final: s.optional(s.string()),
  stoppedBy: s.optional(s.lazy(() => stoppedBySchema)),
  events: s.optional(s.array(s.lazy(() => agentEventSchema))),
});
