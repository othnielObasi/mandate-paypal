import { ApiError, type Declared, type Undeclared } from "../core/api-error.js";
import type { ApiPromise } from "../core/api-promise.js";
import type { RequestOptions } from "../core/api-request.js";
import { noneAuth } from "../core/auth/schemes.js";
import type { RawClient } from "../core/raw-client.js";
import type { ErrorDecoders } from "../core/response-decoder.js";
import { uuid } from "../core/uuid.js";
import * as s from "../core/validation/index.js";
import { agentRunSchema, type AgentRun } from "../models/agent-run.js";
import { approvalSchema, type Approval } from "../models/approval.js";
import { createMandateRequestSchema, type CreateMandateRequest } from "../models/create-mandate-request.js";
import {
  decideApprovalRequestSchema,
  type DecideApprovalRequest,
} from "../models/decide-approval-request.js";
import { errorSchema, type Error } from "../models/error.js";
import { healthSchema, type Health } from "../models/health.js";
import { mandateSchema, type Mandate } from "../models/mandate.js";
import { proposeResultSchema, type ProposeResult } from "../models/propose-result.js";
import { runAgentRequestSchema, type RunAgentRequest } from "../models/run-agent-request.js";
import type { Servers } from "../servers.js";

/**
 * The buyer side of the demo. Single demo user, no login.
 */
export class Demo {
  readonly #rawClient: RawClient;
  readonly #servers: Servers;

  constructor(rawClient: RawClient, servers: Servers) {
    this.#rawClient = rawClient;
    this.#servers = servers;
  }

  /**
   * Sign spending rules
   *
   * @remarks
   * With only `text`, the rules reader (the configured model, or the offline reader) turns the
   * sentence into a policy and Mandate signs it. With `policy`, the rules the user reviewed are
   * validated and signed. Rate limited when the model is called.
   *
   * @returns The signed mandate
   *
   * @throws {@link Demo.CreateMandateError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  createMandate(
    request: Demo.CreateMandateRequestParams,
    options?: RequestOptions,
  ): ApiPromise<Mandate, Demo.CreateMandateError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/mandates"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: createMandateRequestSchema },
      },
      {
        success: { kind: "json", schema: mandateSchema },
        errorFactory: Demo.CreateMandateError,
      },
      options,
    );
  }

  /**
   * Approve or decline a purchase
   *
   * @remarks
   * If the user has a passkey, approving needs a WebAuthn assertion over this exact cart (challenge
   * from `GET /api/approvals/{id}/passkey`). Hard rules (category, seller, injected instructions)
   * can never be approved through.
   *
   * @returns Outcome
   *
   * @throws {@link Demo.DecideApprovalError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  decideApproval(
    request: Demo.DecideApprovalRequestParams,
    options?: RequestOptions,
  ): ApiPromise<ProposeResult, Demo.DecideApprovalError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/approvals/{id}"),
        auth: noneAuth,
        pathParams: [{ name: "id", value: request.id, schema: s.string() }],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: decideApprovalRequestSchema },
      },
      {
        success: { kind: "json", schema: proposeResultSchema },
        errorFactory: Demo.DecideApprovalError,
      },
      options,
    );
  }

  /**
   * Server status and which services are live or simulated
   *
   * @remarks
   * Which integrations this server is running with: real PayPal sandbox or simulated payments, the
   * model behind the agent, where data is stored, and whether Zapier alerts and the kill switch are
   * on. Always sandbox-only.
   *
   * @returns Status
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  getHealth(options?: RequestOptions): ApiPromise<Health, ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/health"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: healthSchema },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * Purchases waiting for the user
   *
   * @remarks
   * Purchases the gate sent to the user (over a soft limit), with when each request expires.
   *
   * @returns Pending approvals
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listApprovals(
    request: Demo.ListApprovalsRequest = {},
    options?: RequestOptions,
  ): ApiPromise<Approval[], ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/approvals"),
        auth: noneAuth,
        pathParams: [],
        query: [{ name: "mandateId", value: request.mandateId, schema: s.optional(s.string()) }],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => approvalSchema)) },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * The demo user's mandates
   *
   * @remarks
   * Every mandate the demo user has signed, with its rules and status (active, paused or revoked).
   *
   * @returns Mandates
   *
   * @throws {@link ApiError} when the API answers with an error status
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  listMandates(options?: RequestOptions): ApiPromise<Mandate[], ApiError> {
    return this.#rawClient.execute(
      {
        method: "GET",
        urlTemplate: this.#servers.default("/api/mandates"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [],
        body: { kind: "empty" },
      },
      {
        success: { kind: "json", schema: s.array(s.lazy(() => mandateSchema)) },
        errorFactory: ApiError,
      },
      options,
    );
  }

  /**
   * Let the shopping agent carry out a task under a mandate
   *
   * @remarks
   * The agent can only search, read and propose. Each proposal goes through the policy gate, which
   * pays, asks the user, or blocks. With `stream: true` the response is NDJSON, one step per line.
   *
   * @returns The run, with every step and the gate's decisions
   *
   * @throws {@link Demo.RunAgentError} when the API answers with an error status — narrow on
   * `err.payload.kind`
   *
   * @throws {@link MandateApiError} when no usable response was produced: a connection failure, a
   * timeout, a body that would not decode, a value that would not encode, or a credential that
   * could not be obtained
   */
  runAgent(
    request: Demo.RunAgentRequestParams,
    options?: RequestOptions,
  ): ApiPromise<AgentRun, Demo.RunAgentError> {
    return this.#rawClient.execute(
      {
        method: "POST",
        urlTemplate: this.#servers.default("/api/agent/run"),
        auth: noneAuth,
        pathParams: [],
        query: [],
        headers: [{ name: "Idempotency-Key", value: uuid(), schema: s.string() }],
        body: { kind: "json", value: request.body, schema: runAgentRequestSchema },
      },
      {
        success: { kind: "json", schema: agentRunSchema },
        errorFactory: Demo.RunAgentError,
      },
      options,
    );
  }
}

export namespace Demo {
  export type CreateMandateRequestParams = {
    body: CreateMandateRequest;
  };

  export class CreateMandateError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<CreateMandateError> = [
      { on: 400, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 422, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 429, kind: "error3", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type DecideApprovalRequestParams = {
    /** The approval ID from `listApprovals` or the agent run. */
    id: string;
    body: DecideApprovalRequest;
  };

  export class DecideApprovalError extends ApiError {
    declare readonly payload:
      | Declared<"error", Error>
      | Declared<"error2", Error>
      | Declared<"error3", Error>
      | Declared<"error4", Error>
      | Undeclared;

    static readonly errors: ErrorDecoders<DecideApprovalError> = [
      { on: 403, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 404, kind: "error2", decode: { kind: "json", schema: errorSchema } },
      { on: 409, kind: "error3", decode: { kind: "json", schema: errorSchema } },
      { on: 410, kind: "error4", decode: { kind: "json", schema: errorSchema } },
    ];
  }

  export type ListApprovalsRequest = {
    /** Only this mandate's approvals. Omit for all. */
    mandateId?: string;
  };

  export type RunAgentRequestParams = {
    body: RunAgentRequest;
  };

  export class RunAgentError extends ApiError {
    declare readonly payload: Declared<"error", Error> | Declared<"error2", Error> | Undeclared;

    static readonly errors: ErrorDecoders<RunAgentError> = [
      { on: 404, kind: "error", decode: { kind: "json", schema: errorSchema } },
      { on: 429, kind: "error2", decode: { kind: "json", schema: errorSchema } },
    ];
  }
}
