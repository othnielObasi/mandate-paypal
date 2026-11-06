import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { actionSchema, type Action } from "./action.js";

export type KillSwitchRequest = {
  action: Action;
  /** Only this mandate. Omit for all of the user's mandates. */
  mandateId?: string;
};

export const killSwitchRequestSchema: Schema<KillSwitchRequest> = s.object<KillSwitchRequest>({
  action: actionSchema,
  mandateId: s.optional(s.string()),
});
