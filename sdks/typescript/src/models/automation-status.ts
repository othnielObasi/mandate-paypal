import * as s from "../core/validation/index.js";
import type { Schema } from "../core/validation/schema.js";
import { alertsSchema, type Alerts } from "./alerts.js";
import { killSwitchSchema, type KillSwitch } from "./kill-switch.js";

export type AutomationStatus = {
  alerts?: Alerts;
  killSwitch?: KillSwitch;
};

export const automationStatusSchema: Schema<AutomationStatus> = s.object<AutomationStatus>({
  alerts: s.optional(s.lazy(() => alertsSchema)),
  killSwitch: s.optional(s.lazy(() => killSwitchSchema)),
});
