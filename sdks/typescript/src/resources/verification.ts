import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { ap2VerdictSchema, type Ap2Verdict } from "../models/ap2-verdict.js";
import { chainVerdictSchema, type ChainVerdict } from "../models/chain-verdict.js";
import { errorSchema, type Error } from "../models/error.js";
import { orderVerdictSchema, type OrderVerdict } from "../models/order-verdict.js";
import { sellerPaymentSchema, type SellerPayment } from "../models/seller-payment.js";
import { verifyChainRequestSchema, type VerifyChainRequest } from "../models/verify-chain-request.js";
import type { Servers } from "../servers.js";

/**
 * Check an agent payment before you ship, or for a dispute. Public keys only, no trust in Mandate
 * needed.
 */
export class Verification {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;

  constructor(rawClient: RawClient, servers: Servers) {
    this.#rawClient = rawClient;
    this.#servers = servers;
  }

  /**
   * AP2 v0.2 evidence pack for a PayPal order
   *
   * @remarks
   * The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256), the
   * checkout and payment receipts, budget context, the passkey assertion if the buyer approved on
   * their device, and every check with its result. Verify independently with `/api/ap2/jwks`.
   *
   * @returns Evidence pack and verdict
   *
   * @throws {@link Verification.GetAp2EvidenceError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getAp2Evidence(
    request: Verification.GetAp2EvidenceRequest,
    options?: RequestOptions,
  ): ApiPromise<Ap2Verdict, Verification.GetAp2EvidenceError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/ap2/orders/{paypalOrderId}"),
        auth: noneAuth,
        pathParams: [{ name: "paypalOrderId", value: request.paypalOrderId, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: ap2VerdictSchema },
        errorFactory: Verification.GetAp2EvidenceError,
      },
      options,
    );
  }

  /**
   * A merchant's agent payments with their verdicts
   *
   * @remarks
   * Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2
   * result. A seller's queue of "safe to fulfil" and "don't ship" orders.
   *
   * @returns Payments, newest first
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listSellerPayments(
    request: Verification.ListSellerPaymentsRequest = {},
    options?: RequestOptions,
  ): ApiPromise<SellerPayment[], ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/seller"),
        auth: noneAuth,
        pathParams: [],
        query: [{ name: "merchantId", value: request.merchantId, schema: s.optional(s.string()) }],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => sellerPaymentSchema)) },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * Verify a Mandate v1 credential chain you hold
   *
   * @remarks
   * Checks an Intent, Cart and Payment Mandate chain against the published keys.
   *
   * @returns Verdict
   *
   * @throws {@link Verification.VerifyChainError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  verifyChain(
    request: Verification.VerifyChainRequestParams,
    options?: RequestOptions,
  ): ApiPromise<ChainVerdict, Verification.VerifyChainError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/verify"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: verifyChainRequestSchema },
      },
      {
        success: { kind: "json", schema: chainVerdictSchema },
        errorFactory: Verification.VerifyChainError,
      },
      options,
    );
  }

  /**
   * Verdict for an agent payment
   *
   * @remarks
   * Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks
   * (Intent, Cart and Payment Mandates, Ed25519), the `paypal_order_record` check (PayPal's own
   * order record, read with the PayPal Server SDK, shows the signed amount captured), and the AP2
   * v0.2 verdict in `ap2`. Fulfil only when `ok` and `ap2.ok` are both true.
   *
   * @returns Verdict. Check `ok`; a 200 does not mean the payment is valid.
   *
   * @throws {@link Verification.VerifyOrderError} when the API answers with an error status —
   * narrow on `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  verifyOrder(
    request: Verification.VerifyOrderRequest,
    options?: RequestOptions,
  ): ApiPromise<OrderVerdict, Verification.VerifyOrderError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/verify/{paypalOrderId}"),
        auth: noneAuth,
        pathParams: [{ name: "paypalOrderId", value: request.paypalOrderId, schema: s.string() }],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: orderVerdictSchema },
        errorFactory: Verification.VerifyOrderError,
      },
      options,
    );
  }
}

export namespace Verification {
  export type GetAp2EvidenceRequest = {
    /** PayPal order ID (sandbox), or `SIM-…` in offline mode. */
    paypalOrderId: string;
  };

  export class GetAp2EvidenceError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<GetAp2EvidenceError> = [
      { on: 404, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ListSellerPaymentsRequest = {
    /** Only this merchant's payments. Omit for all. */
    merchantId?: string;
  };

  export type VerifyChainRequestParams = {
    body: VerifyChainRequest;
  };

  export class VerifyChainError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<VerifyChainError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type VerifyOrderRequest = {
    /** PayPal order ID (sandbox), or `SIM-…` in offline mode. */
    paypalOrderId: string;
  };

  export class VerifyOrderError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Undeclared;

    static readonly errors: ErrorDecoders<VerifyOrderError> = [
      { on: 404, kind: "error", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
