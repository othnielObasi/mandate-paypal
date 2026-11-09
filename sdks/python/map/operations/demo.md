<!-- Generated file — do not edit; regenerated with the SDK. -->

# Demo — operations

Accessor: `client.demo` · Source: `mandate_api/apis/demo.py` · 6 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.demo.create_mandate

- **Route**: `POST /api/mandates`
- **Signature**: `def create_mandate(body: CreateMandateRequest | CreateMandateRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `Mandate`
- **Returns (raw)**: `ApiResult[Mandate, CreateMandateErrorBody]`
- **Error**: `CreateMandateErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 422, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `CreateMandateRequest` | `mandate_api/models/create_mandate_request.py` |
| `CreateMandateRequestDict` | `mandate_api/models/create_mandate_request.py` |
| `Mandate` | `mandate_api/models/mandate.py` |
| `CreateMandateErrorBody` | `mandate_api/errors/create_mandate_error.py` |
| `Error` | `mandate_api/models/error.py` |

### client.demo.decide_approval

- **Route**: `POST /api/approvals/{id}`
- **Signature**: `def decide_approval(id_: str, body: DecideApprovalRequest | DecideApprovalRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `id_`, `body`
- **Params**: `id_` — path `id` · `body` — JSON body
- **Returns (parsed)**: `ProposeResult`
- **Returns (raw)**: `ApiResult[ProposeResult, DecideApprovalErrorBody]`
- **Error**: `DecideApprovalErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [403, 404, 409, 410] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `DecideApprovalRequest` | `mandate_api/models/decide_approval_request.py` |
| `DecideApprovalRequestDict` | `mandate_api/models/decide_approval_request.py` |
| `ProposeResult` | `mandate_api/models/propose_result.py` |
| `DecideApprovalErrorBody` | `mandate_api/errors/decide_approval_error.py` |
| `Error` | `mandate_api/models/error.py` |

### client.demo.get_health

- **Route**: `GET /api/health`
- **Signature**: `def get_health(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `Health`
- **Returns (raw)**: `ApiResult[Health, RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Health` | `mandate_api/models/health.py` |

### client.demo.list_approvals

- **Route**: `GET /api/approvals`
- **Signature**: `def list_approvals(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None)`
- **Params**: `mandate_id` — query `mandateId`
- **Returns (parsed)**: `list[Approval]`
- **Returns (raw)**: `ApiResult[list[Approval], RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Approval` | `mandate_api/models/approval.py` |

### client.demo.list_mandates

- **Route**: `GET /api/mandates`
- **Signature**: `def list_mandates(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `list[Mandate]`
- **Returns (raw)**: `ApiResult[list[Mandate], RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Mandate` | `mandate_api/models/mandate.py` |

### client.demo.run_agent

- **Route**: `POST /api/agent/run`
- **Signature**: `def run_agent(body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `AgentRun`
- **Returns (raw)**: `ApiResult[AgentRun, RunAgentErrorBody]`
- **Error**: `RunAgentErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [404, 429] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `RunAgentRequest` | `mandate_api/models/run_agent_request.py` |
| `RunAgentRequestDict` | `mandate_api/models/run_agent_request.py` |
| `AgentRun` | `mandate_api/models/agent_run.py` |
| `RunAgentErrorBody` | `mandate_api/errors/run_agent_error.py` |
| `Error` | `mandate_api/models/error.py` |

