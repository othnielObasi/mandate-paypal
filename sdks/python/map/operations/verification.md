<!-- Generated file — do not edit; regenerated with the SDK. -->

# Verification — operations

Accessor: `client.verification` · Source: `mandate_api/apis/verification.py` · 4 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.verification.get_ap2_evidence

- **Route**: `GET /api/ap2/orders/{paypalOrderId}`
- **Signature**: `def get_ap2_evidence(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `paypal_order_id`
- **Params**: `paypal_order_id` — path `paypalOrderId`
- **Returns (parsed)**: `Ap2Verdict`
- **Returns (raw)**: `ApiResult[Ap2Verdict, GetAp2EvidenceErrorBody]`
- **Error**: `GetAp2EvidenceErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `Ap2Verdict` | `mandate_api/models/ap2_verdict.py` |
| `GetAp2EvidenceErrorBody` | `mandate_api/errors/get_ap2_evidence_error.py` |
| `Error` | `mandate_api/models/error.py` |

### client.verification.list_seller_payments

- **Route**: `GET /api/seller`
- **Signature**: `def list_seller_payments(*, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None)`
- **Params**: `merchant_id` — query `merchantId`
- **Returns (parsed)**: `list[SellerPayment]`
- **Returns (raw)**: `ApiResult[list[SellerPayment], RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `SellerPayment` | `mandate_api/models/seller_payment.py` |

### client.verification.verify_chain

- **Route**: `POST /api/verify`
- **Signature**: `def verify_chain(body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `ChainVerdict`
- **Returns (raw)**: `ApiResult[ChainVerdict, VerifyChainErrorBody]`
- **Error**: `VerifyChainErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `VerifyChainRequest` | `mandate_api/models/verify_chain_request.py` |
| `VerifyChainRequestDict` | `mandate_api/models/verify_chain_request.py` |
| `ChainVerdict` | `mandate_api/models/chain_verdict.py` |
| `VerifyChainErrorBody` | `mandate_api/errors/verify_chain_error.py` |
| `Error` | `mandate_api/models/error.py` |

### client.verification.verify_order

- **Route**: `GET /api/verify/{paypalOrderId}`
- **Signature**: `def verify_order(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `paypal_order_id`
- **Params**: `paypal_order_id` — path `paypalOrderId`
- **Returns (parsed)**: `OrderVerdict`
- **Returns (raw)**: `ApiResult[OrderVerdict, VerifyOrderErrorBody]`
- **Error**: `VerifyOrderErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [404] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `OrderVerdict` | `mandate_api/models/order_verdict.py` |
| `VerifyOrderErrorBody` | `mandate_api/errors/verify_order_error.py` |
| `Error` | `mandate_api/models/error.py` |

