<!-- Generated file — do not edit; regenerated with the SDK. -->

# Automation — operations

Accessor: `client.automation` · Source: `src/resources/automation.ts` · 1 operation · Request and error types: namespace `Automation`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `mandate-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### killSwitch

- **Signature**: `killSwitch(request: Automation.KillSwitchRequestParams, options?: RequestOptions): ApiPromise<KillSwitchResult, Automation.KillSwitchError>`
- **Wire**: `POST /api/automation/kill-switch`
- **Auth**: `automationSecret`
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `KillSwitchResult`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Automation.KillSwitchError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"error2"` [401] `Error` · `"error3"` [404] `Error` · `"error4"` [503] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Automation.KillSwitchRequestParams` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `KillSwitchRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `KillSwitchRequest` | `killSwitchRequestSchema` | `src/models/kill-switch-request.ts` |
| `KillSwitchResult` | `killSwitchResultSchema` | `src/models/kill-switch-result.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

