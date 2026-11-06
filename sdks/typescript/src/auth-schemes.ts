import type { ClientOptions } from "./client-options.js";
import type { AuthScheme } from "./core/api-request.js";
import { bearerAuth } from "./core/auth/schemes.js";

export type AuthSchemes = {
  readonly automationSecret: AuthScheme;
};

export function buildAuthSchemes(options: ClientOptions): AuthSchemes {
  return {
    automationSecret: bearerAuth(options.automationSecret),
  };
}
