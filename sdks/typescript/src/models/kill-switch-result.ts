import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { statusSchema, type Status } from "./status.js";

export type KillSwitchResult = {
  ok?: boolean;
  action?: string;
  status?: Status;
  /** IDs of the mandates that changed */
  changed?: string[];
};

export const killSwitchResultSchema: Schema<KillSwitchResult> = s.object<KillSwitchResult>({
  ok: s.optional(s.boolean()),
  action: s.optional(s.string()),
  status: s.optional(s.lazy(() => statusSchema)),
  changed: s.optional(s.array(s.string())),
});
