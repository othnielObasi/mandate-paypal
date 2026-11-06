import * as s from "../core/validation/index.js";
import type { EnumSchema } from "../core/validation/schema.js";

export const ModelProvider = {
  MetaModelApi: "Meta Model API",
  ClaudeApi: "Claude API",
  Offline: "offline",
} as const;
export type ModelProvider = (typeof ModelProvider)[keyof typeof ModelProvider] | (string & {});

export const modelProviderSchema: EnumSchema<ModelProvider> = s.enumOf<ModelProvider>(ModelProvider);
