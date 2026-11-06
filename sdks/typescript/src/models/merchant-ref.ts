import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type MerchantRef = {
  id?: string;
  name?: string;
};

export const merchantRefSchema: Schema<MerchantRef> = s.object<MerchantRef>({
  id: s.optional(s.string()),
  name: s.optional(s.string()),
});
