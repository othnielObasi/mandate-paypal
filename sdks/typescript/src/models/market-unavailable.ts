import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const MarketUnavailable = {
  Ask: "ask",
  Block: "block",
  Allow: "allow",
} as const;
export type MarketUnavailable = (typeof MarketUnavailable)[keyof typeof MarketUnavailable] | (string & {});

export const marketUnavailableSchema: EnumSchema<MarketUnavailable> =
  s.enumOf<MarketUnavailable>(MarketUnavailable);
