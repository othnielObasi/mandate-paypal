import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { errorSchema, type Error } from "../models/error.js";
import { receiptSchema, type Receipt } from "../models/receipt.js";
import { chainResultSchema, type ChainResult } from "../models/unions/chain-result.js";
import { verifyLogRequestSchema, type VerifyLogRequest } from "../models/verify-log-request.js";
import type { Servers } from "../servers.js";

/**
 * Mandate's signed, hash-chained decision log.
 */
export class Receipts {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;

  constructor(rawClient: RawClient, servers: Servers) {
    this.#rawClient = rawClient;
    this.#servers = servers;
  }

  /**
   * The signed, hash-chained decision log
   *
   * @remarks
   * Every decision Mandate made, in order. Each receipt carries the hash of the one before it and
   * an Ed25519 signature, so any edit, insertion or deletion breaks the chain.
   *
   * @returns Receipts in order
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listReceipts(
    request: Receipts.ListReceiptsRequest = {},
    options?: RequestOptions,
  ): ApiPromise<Receipt[], ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/receipts"),
        auth: noneAuth,
        pathParams: [],
        query: [{ name: "mandateId", value: request.mandateId, schema: s.optional(s.string()) }],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => receiptSchema)) },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * Verify a copy of the log you hold
   *
   * @remarks
   * Names the first altered entry (`brokenAt`) and why.
   *
   * @returns Result
   *
   * @throws {@link Receipts.VerifyLogCopyError} when the API answers with an error status — narrow
   * on `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  verifyLogCopy(
    request: Receipts.VerifyLogCopyRequest,
    options?: RequestOptions,
  ): ApiPromise<ChainResult, Receipts.VerifyLogCopyError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/receipts/verify"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: verifyLogRequestSchema },
      },
      {
        success: { kind: "json", schema: chainResultSchema },
        errorFactory: Receipts.VerifyLogCopyError,
      },
      options,
    );
  }

  /**
   * Verify the server's own log
   *
   * @remarks
   * Re-checks every hash link and signature in the server's decision log.
   *
   * @returns Result
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  verifyServerLog(options?: RequestOptions): ApiPromise<ChainResult, ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/receipts/verify"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: chainResultSchema },
        errorFactory: ApiError,
      },
      options,
    );
  }
}

export namespace Receipts {
  export type ListReceiptsRequest = {
    /** Only this mandate's receipts. Omit for the whole log. */
    mandateId?: string;
  };

  export type VerifyLogCopyRequest = {
    body: VerifyLogRequest;
  };

  export class VerifyLogCopyError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<VerifyLogCopyError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
