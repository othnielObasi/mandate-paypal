import { ApiError } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import { jwksSchema, type Jwks } from "../models/jwks.js";
import { trustSchema, type Trust } from "../models/trust.js";
import type { Servers } from "../servers.js";

/**
 * Public keys for everything Mandate signs.
 */
export class Keys {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;

  constructor(rawClient: RawClient, servers: Servers) {
    this.#rawClient = rawClient;
    this.#servers = servers;
  }

  /**
   * ES256 public keys (JWKS) for every AP2 credential
   *
   * @remarks
   * Provider, agent, payment gateway, merchants and users. Look keys up by `kid`.
   *
   * @returns JWKS
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getAp2Jwks(options?: RequestOptions): ApiPromise<Jwks, ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/ap2/jwks"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: jwksSchema },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * Ed25519 public key that signs receipts and permits
   *
   * @remarks
   * The PEM public key for checking the `signature` on every receipt in the decision log.
   *
   * @returns PEM public key
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getReceiptPublicKey(options?: RequestOptions): ApiPromise<undefined, ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/public-key"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "empty" },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * All public keys, Mandate v1 (Ed25519 PEM) and AP2 v0.2 (JWKS)
   *
   * @remarks
   * The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's
   * verified status), the platform key, and the AP2 JWKS. Cache it to verify payments offline.
   *
   * @returns Keys
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getTrust(options?: RequestOptions): ApiPromise<Trust, ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/trust"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: trustSchema },
        errorFactory: ApiError,
      },
      options,
    );
  }
}
