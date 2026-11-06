import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { receiptSchema, type Receipt } from "./receipt.js";

export type VerifyLogRequest = {
  receipts: Receipt[];
};

export const verifyLogRequestSchema: Schema<VerifyLogRequest> = s.object<VerifyLogRequest>({
  receipts: s.array(s.lazy(() => receiptSchema)),
});
