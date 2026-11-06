<!-- Generated file — do not edit; regenerated with the SDK. -->

# Receipts — operations

Accessor: `client.receipts` · Source: `src/resources/receipts.ts` · 3 operations · Request and error types: namespace `Receipts`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `mandate-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### listReceipts

- **Signature**: `listReceipts(request?: Receipts.ListReceiptsRequest, options?: RequestOptions): ApiPromise<Receipt[], ApiError>`
- **Wire**: `GET /api/receipts`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Receipt[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

**Fields** — `Receipts.ListReceiptsRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `mandateId` | `query` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `Receipt` | `receiptSchema` | `src/models/receipt.ts` |

### verifyLogCopy

- **Signature**: `verifyLogCopy(request: Receipts.VerifyLogCopyRequest, options?: RequestOptions): ApiPromise<ChainResult, Receipts.VerifyLogCopyError>`
- **Wire**: `POST /api/receipts/verify`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ChainResult`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Receipts.VerifyLogCopyError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Receipts.VerifyLogCopyRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `VerifyLogRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `VerifyLogRequest` | `verifyLogRequestSchema` | `src/models/verify-log-request.ts` |
| `ChainResult` | `chainResultSchema` | `src/models/unions/chain-result.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### verifyServerLog

- **Signature**: `verifyServerLog(options?: RequestOptions): ApiPromise<ChainResult, ApiError>`
- **Wire**: `GET /api/receipts/verify`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `ChainResult`
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `ChainResult` | `chainResultSchema` | `src/models/unions/chain-result.ts` |

