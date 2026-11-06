<!-- Generated file — do not edit; regenerated with the SDK. -->

# Verification — operations

Accessor: `client.verification` · Source: `src/resources/verification.ts` · 4 operations · Request and error types: namespace `Verification`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `mandate-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getAp2Evidence

- **Signature**: `getAp2Evidence(request: Verification.GetAp2EvidenceRequest, options?: RequestOptions): ApiPromise<Ap2Verdict, Verification.GetAp2EvidenceError>`
- **Wire**: `GET /api/ap2/orders/{paypalOrderId}`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Ap2Verdict`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Verification.GetAp2EvidenceError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Verification.GetAp2EvidenceRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `paypalOrderId` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `Ap2Verdict` | `ap2VerdictSchema` | `src/models/ap2-verdict.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### listSellerPayments

- **Signature**: `listSellerPayments(request?: Verification.ListSellerPaymentsRequest, options?: RequestOptions): ApiPromise<SellerPayment[], ApiError>`
- **Wire**: `GET /api/seller`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `SellerPayment[]` — a bare `application/json` array; the success type *is* the array, not a wrapper model
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

**Fields** — `Verification.ListSellerPaymentsRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `merchantId` | `query` | `string` | no |

| Type | Schema value | Source |
| --- | --- | --- |
| `SellerPayment` | `sellerPaymentSchema` | `src/models/seller-payment.ts` |

### verifyChain

- **Signature**: `verifyChain(request: Verification.VerifyChainRequestParams, options?: RequestOptions): ApiPromise<ChainVerdict, Verification.VerifyChainError>`
- **Wire**: `POST /api/verify`
- **Auth**: none — public; no credential is sent
- **Request body**: `application/json` — the `body` field
- **SDK-sent**: `header Idempotency-Key` (minted per call)
- **Returns**: `ChainVerdict`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Verification.VerifyChainError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [400] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Verification.VerifyChainRequestParams` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `body` | `body` | `VerifyChainRequest` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `VerifyChainRequest` | `verifyChainRequestSchema` | `src/models/verify-chain-request.ts` |
| `ChainVerdict` | `chainVerdictSchema` | `src/models/chain-verdict.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

### verifyOrder

- **Signature**: `verifyOrder(request: Verification.VerifyOrderRequest, options?: RequestOptions): ApiPromise<OrderVerdict, Verification.VerifyOrderError>`
- **Wire**: `GET /api/verify/{paypalOrderId}`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `OrderVerdict`
- **Error**: `MandateApiError` with `kind: "api"`, an instance of `Verification.VerifyOrderError` — **typed arms**, narrowed on `err.payload.kind`
- **Error arms**: `"error"` [404] `Error` · `"undeclared"` [any other] `rawBody: ArrayBuffer`

**Fields** — `Verification.VerifyOrderRequest` (1):

| Field | Channel | Type | Req |
| --- | --- | --- | --- |
| `paypalOrderId` | `path` | `string` | yes |

| Type | Schema value | Source |
| --- | --- | --- |
| `OrderVerdict` | `orderVerdictSchema` | `src/models/order-verdict.ts` |
| `Error` | `errorSchema` | `src/models/error.ts` |

