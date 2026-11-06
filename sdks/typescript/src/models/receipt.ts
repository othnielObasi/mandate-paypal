import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";

export type Receipt = {
  seq: number;
  mandateId?: string;
  type: string;
  summary: string;
  payload?: Record<string, unknown>;
  payloadHash: string;
  createdAt: Date;
  prevHash: string;
  hash: string;
  /** Ed25519 over `hash`, verify with /api/public-key */
  signature: string;
};

export const receiptSchema: Schema<Receipt> = s.object<Receipt>({
  seq: s.int(),
  mandateId: s.optional(s.string()),
  type: s.string(),
  summary: s.string(),
  payload: s.optional(s.record(s.string(), s.unknown())),
  payloadHash: s.string(),
  createdAt: s.dateTime(),
  prevHash: s.string(),
  hash: s.string(),
  signature: s.string(),
});
