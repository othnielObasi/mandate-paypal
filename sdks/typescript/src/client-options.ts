import type { TokenProvider } from "./core/auth/credentials.js";
import type { CoreClientOptions } from "./core/client-options.js";
import { ServerEnvironment } from "./servers.js";

export type ClientOptions = SdkClientOptions & CoreClientOptions;

type SdkClientOptions = ServerOptions & {
  /** The server's AUTOMATION_SECRET (16+ characters), stored in the Zap. */
  readonly automationSecret?: TokenProvider | undefined;
};

type ServerOptions =
  | {
      readonly serverEnvironment?: typeof ServerEnvironment.Production;
      /** Hosted demo (Render, PayPal sandbox) */
      readonly serverOptions?: {
        baseUrl?: string;
      };
    }
  | {
      readonly serverEnvironment: typeof ServerEnvironment.Local;
      /** Hosted demo (Render, PayPal sandbox) */
      readonly serverOptions?: {
        baseUrl?: string;
      };
    };
