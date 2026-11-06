import { buildAuthSchemes, type AuthSchemes } from "./auth-schemes.js";
import type { ClientOptions } from "./client-options.js";
import { buildCoreClientOptions } from "./core/client-options.js";
import { RawClient } from "./core/raw-client.js";
import * as host from "./core/runtime-environment.js";
import * as s from "./core/validation/index.js";
import { Automation } from "./resources/automation.js";
import { Demo } from "./resources/demo.js";
import { Keys } from "./resources/keys.js";
import { Receipts } from "./resources/receipts.js";
import { Verification } from "./resources/verification.js";
import { buildServers, type Servers } from "./servers.js";

/**
 * Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
 * AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's
 * closed mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a
 * dispute reviewer check a payment with public keys alone. The **Demo** endpoints drive the same
 * flow the app uses: sign rules, let the agent shop, approve over-limit purchases.
 *
 * Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
 * PayPal order IDs (`SIM-…`); with PayPal sandbox keys the IDs are real sandbox order IDs.
 */
export class MandateApiClient {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;
  #verification?: Verification;
  #keys?: Keys;
  #receipts?: Receipts;
  #demo?: Demo;
  #automation?: Automation;

  constructor(options: ClientOptions = {}) {
    this.#rawClient = new RawClient({
      ...buildCoreClientOptions(options, "MANDATE_API_CLIENT_LOG"),
      defaultHeaders: [
        { name: "User-Agent", value: "MandateApiClient/0.2.0 TypeScript", schema: s.string() },
        { name: "X-APIMatic-Lang", value: "TypeScript", schema: s.string() },
        { name: "X-APIMatic-Package-Version", value: "0.2.0", schema: s.string() },
        { name: "X-APIMatic-Gen-Version", value: "4.0.0", schema: s.string() },
        { name: "X-APIMatic-OS", value: host.operatingSystem(), schema: s.optional(s.string()) },
        { name: "X-APIMatic-Runtime", value: host.runtimeDescription(), schema: s.optional(s.string()) },
      ],
      defaultQuery: [],
      defaultPathParams: [],
    });

    this.#servers = buildServers(options);

    this.#auth = buildAuthSchemes(options);
  }

  /**
   * Check an agent payment before you ship, or for a dispute. Public keys only, no trust in Mandate
   * needed.
   */
  get verification(): Verification {
    return (this.#verification ??= new Verification(this.#rawClient, this.#servers));
  }

  /**
   * Public keys for everything Mandate signs.
   */
  get keys(): Keys {
    return (this.#keys ??= new Keys(this.#rawClient, this.#servers));
  }

  /**
   * Mandate's signed, hash-chained decision log.
   */
  get receipts(): Receipts {
    return (this.#receipts ??= new Receipts(this.#rawClient, this.#servers));
  }

  /**
   * The buyer side of the demo. Single demo user, no login.
   */
  get demo(): Demo {
    return (this.#demo ??= new Demo(this.#rawClient, this.#servers));
  }

  /**
   * Zapier. Out: with `ZAPIER_HOOK_URL` set, Mandate posts an `AutomationEvent` to that Catch Hook
   * for every approval request, blocked purchase, payment, failed payment and mandate status
   * change. In: a Zap can pull the kill switch with `AUTOMATION_SECRET`. Automations can stop
   * spending, never approve it.
   */
  get automation(): Automation {
    return (this.#automation ??= new Automation(this.#rawClient, this.#servers, this.#auth));
  }
}
