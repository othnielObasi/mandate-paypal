import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const Alerts = {
  Zapier: "zapier",
  Off: "off",
} as const;
export type Alerts = (typeof Alerts)[keyof typeof Alerts] | (string & {});

export const alertsSchema: EnumSchema<Alerts> = s.enumOf<Alerts>(Alerts);
