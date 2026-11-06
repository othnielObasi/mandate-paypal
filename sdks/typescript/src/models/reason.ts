import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Reason = {
  SequenceGap: "sequence_gap",
  ChainBreak: "chain_break",
  PayloadMismatch: "payload_mismatch",
  HashMismatch: "hash_mismatch",
  BadSignature: "bad_signature",
} as const;
export type Reason = (typeof Reason)[keyof typeof Reason] | (string & {});

export const reasonSchema: EnumSchema<Reason> = s.enumOf<Reason>(Reason);
