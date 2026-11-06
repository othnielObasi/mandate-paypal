import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Approval = {
  id?: string;
  mandateId?: string;
  status?: string;
  expiresAt?: Date;
};

export const approvalSchema: Schema<Approval> = s.object<Approval>({
  id: s.optional(s.string()),
  mandateId: s.optional(s.string()),
  status: s.optional(s.string()),
  expiresAt: s.optional(s.dateTime()),
});
