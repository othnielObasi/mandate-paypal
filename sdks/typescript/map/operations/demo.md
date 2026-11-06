<!-- Generated file — do not edit; regenerated with the SDK. -->

# Demo — operations

Accessor: `client.demo` · Source: `src/resources/demo.ts` · 6 operations · Request and error types: namespace `Demo`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `mandate-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### createMandate

- **Signature**: `createMandate(request: Demo.CreateMandateRequestParams, options?: RequestOptions): ApiPromise<Mandate, Demo.CreateMandateError>`
- **Wire**: `POST /api/mandates`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `Mandate`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Demo.CreateMandateError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [422] `Error` · `"error3"` [429] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Demo.CreateMandateRequestParams` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `CreateMandateRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `CreateMandateRequest` | `createMandateRequestSchema` | `src/models/create-mandate-request.ts` |
| `Mandate` | `mandateSchema` | `src/models/mandate.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### decideApproval

- **Signature**: `decideApproval(request: Demo.DecideApprovalRequestParams, options?: RequestOptions): ApiPromise<ProposeResult, Demo.DecideApprovalError>`
- **Wire**: `POST /api/approvals/{id}`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ProposeResult`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Demo.DecideApprovalError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [403] `Error` · `"error2"` [404] `Error` · `"error3"` [409] `Error` · `"error4"` [410] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Demo.DecideApprovalRequestParams` (2):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `id` | `path` | `string` | yes |
| `body` | `body` | `DecideApprovalRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `DecideApprovalRequest` | `decideApprovalRequestSchema` | `src/models/decide-approval-request.ts` |
| `ProposeResult` | `proposeResultSchema` | `src/models/propose-result.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### getHealth

- **Signature**: `getHealth(options?: RequestOptions): ApiPromise<Health, ApiError>`
- **Wire**: `GET /api/health`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Health`
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `Health` | `healthSchema` | `src/models/health.ts` |

### listApprovals

- **Signature**: `listApprovals(request?: Demo.ListApprovalsRequest, options?: RequestOptions): ApiPromise<Approval[], ApiError>`
- **Wire**: `GET /api/approvals`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Approval[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

**Fields** — `Demo.ListApprovalsRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `mandateId` | `query` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Approval` | `approvalSchema` | `src/models/approval.ts` |

### listMandates

- **Signature**: `listMandates(options?: RequestOptions): ApiPromise<Mandate[], ApiError>`
- **Wire**: `GET /api/mandates`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Mandate[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `Mandate` | `mandateSchema` | `src/models/mandate.ts` |

### runAgent

- **Signature**: `runAgent(request: Demo.RunAgentRequestParams, options?: RequestOptions): ApiPromise<AgentRun, Demo.RunAgentError>`
- **Wire**: `POST /api/agent/run`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `AgentRun`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Demo.RunAgentError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [404] `Error` · `"error2"` [429] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Demo.RunAgentRequestParams` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `RunAgentRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `RunAgentRequest` | `runAgentRequestSchema` | `src/models/run-agent-request.ts` |
| `AgentRun` | `agentRunSchema` | `src/models/agent-run.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

