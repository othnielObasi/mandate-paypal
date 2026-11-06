import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

/** The signed log entry an event reports */
export type ReceiptRef = {
  seq?: number;
  hash?: string;
};

export const receiptRefSchema: Schema<ReceiptRef> = s.object<ReceiptRef>({
  seq: s.optional(s.int()),
  hash: s.optional(s.string()),
});
