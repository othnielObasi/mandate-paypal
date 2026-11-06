import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const KillSwitch = {
  On: "on",
  Off: "off",
} as const;
export type KillSwitch = (typeof KillSwitch)[keyof typeof KillSwitch] | (string & {});

export const killSwitchSchema: EnumSchema<KillSwitch> = s.enumOf<KillSwitch>(KillSwitch);
