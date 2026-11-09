<!-- Generated file — do not edit; regenerated with the SDK. -->

# Automation — operations

Accessor: `client.automation` · Source: `mandate_api/apis/automation.py` · 1 operation

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.automation.kill_switch

- **Route**: `POST /api/automation/kill-switch`
- **Auth**: `automation_secret`
- **Signature**: `def kill_switch(body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `KillSwitchResult`
- **Returns (raw)**: `ApiResult[KillSwitchResult, KillSwitchErrorBody]`
- **Error**: `KillSwitchErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400, 401, 404, 503] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `KillSwitchRequest` | `mandate_api/models/kill_switch_request.py` |
| `KillSwitchRequestDict` | `mandate_api/models/kill_switch_request.py` |
| `KillSwitchResult` | `mandate_api/models/kill_switch_result.py` |
| `KillSwitchErrorBody` | `mandate_api/errors/kill_switch_error.py` |
| `Error` | `mandate_api/models/error.py` |

