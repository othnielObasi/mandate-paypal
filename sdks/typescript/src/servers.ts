import type { ClientOptions } from "./client-options.js";
import type { ServerBase, UrlTemplate } from "./core/api-request.js";
import { ConfigurationError } from "./core/errors.js";
import { resolveBaseUrl } from "./core/url.js";
import * as s from "./core/validation/index.js";

export const ServerEnvironment = {
  Production: "production",
  Local: "local",
} as const;
export type ServerEnvironment = (typeof ServerEnvironment)[keyof typeof ServerEnvironment];

export type Servers = {
  default: (subPath: string) => UrlTemplate;
};

const productionSchemas = {
  baseUrl: s.of(s.defaulted(s.string(), "https://mandate-e13m.onrender.com")),
};

const localSchemas = {
  baseUrl: s.of(s.defaulted(s.string(), "http://localhost:3000")),
};

export function buildServers(options: ClientOptions): Servers {
  const base = {
    default: resolveBaseUrl(defaultServer(options)),
  };
  return {
    default: (subPath) => ({ baseUrl: base.default, subPath }),
  };
}

function defaultServer(options: ClientOptions): ServerBase {
  const environment = options.serverEnvironment;
  switch (environment) {
    case ServerEnvironment.Production:
    case undefined:
      return { baseUrl: productionSchemas.baseUrl.decode(options.serverOptions?.baseUrl) };
    case ServerEnvironment.Local:
      return { baseUrl: localSchemas.baseUrl.decode(options.serverOptions?.baseUrl) };
    default:
      unknownEnvironment(environment);
  }
}

function unknownEnvironment(environment: never): never {
  throw new ConfigurationError(`Unknown server environment: ${String(environment)}`);
}
