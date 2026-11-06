import type { AuthSchemes } from "../auth-schemes.js";
import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { errorSchema, type Error } from "../models/error.js";
import { killSwitchRequestSchema, type KillSwitchRequest } from "../models/kill-switch-request.js";
import { killSwitchResultSchema, type KillSwitchResult } from "../models/kill-switch-result.js";
import type { Servers } from "../servers.js";

/**
 * Zapier. Out: with `ZAPIER_HOOK_URL` set, Mandate posts an `AutomationEvent` to that Catch Hook
 * for every approval request, blocked purchase, payment, failed payment and mandate status change.
 * In: a Zap can pull the kill switch with `AUTOMATION_SECRET`. Automations can stop spending, never
 * approve it.
 */
export class Automation {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;
  readonly #auth: AuthSchemes;

  constructor(rawClient: RawClient, servers: Servers, auth: AuthSchemes) {
    this.#rawClient = rawClient;
    this.#servers = servers;
    this.#auth = auth;
  }

  /**
   * Pause, resume or revoke spending from an automation
   *
   * @remarks
   * For a Zap such as "text STOP to pause every agent". Without `mandateId` it acts on all of the
   * user's mandates. Logged in the signed decision log as "via automation".
   *
   * @returns The mandates that changed
   *
   * @throws {@link Automation.KillSwitchError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  killSwitch(
    request: Automation.KillSwitchRequestParams,
    options?: RequestOptions,
  ): ApiPromise<KillSwitchResult, Automation.KillSwitchError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/automation/kill-switch"),
        auth: this.#auth.automationSecret,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: killSwitchRequestSchema },
      },
      {
        success: { kind: "json", schema: killSwitchResultSchema },
        errorFactory: Automation.KillSwitchError,
      },
      options,
    );
  }
}

export namespace Automation {
  export type KillSwitchRequestParams = {
    body: KillSwitchRequest;
  };

  export class KillSwitchError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Declared<"error4", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<KillSwitchError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 401, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error3", decode: { kind: "json", schema: errorSchema } },
      { on: 503, kind: "error4", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
