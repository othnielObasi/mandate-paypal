<!-- Generated file — do not edit; regenerated with the SDK. -->

# Receipts — operations

Accessor: `client.receipts` · Source: `mandate_api/apis/receipts.py` · 3 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded.

### client.receipts.list_receipts

- **Route**: `GET /api/receipts`
- **Signature**: `def list_receipts(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None)`
- **Params**: `mandate_id` — query `mandateId`
- **Returns (parsed)**: `list[Receipt]`
- **Returns (raw)**: `ApiResult[list[Receipt], RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Receipt` | `mandate_api/models/receipt.py` |

### client.receipts.verify_log_copy

- **Route**: `POST /api/receipts/verify`
- **Signature**: `def verify_log_copy(body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None)`
  - required, positional: `body`
- **Params**: `body` — JSON body
- **Returns (parsed)**: `ChainResult`
- **Returns (raw)**: `ApiResult[ChainResult, VerifyLogCopyErrorBody]`
- **Error**: `VerifyLogCopyErrorBody` — **Case A (typed)**
- **Error arms**: `Error` [400] · `RawError` [anything unmapped]

| Type | Source |
| --- | --- |
| `VerifyLogRequest` | `mandate_api/models/verify_log_request.py` |
| `VerifyLogRequestDict` | `mandate_api/models/verify_log_request.py` |
| `ChainResult` | `mandate_api/models/unions/chain_result.py` |
| `VerifyLogCopyErrorBody` | `mandate_api/errors/verify_log_copy_error.py` |
| `Error` | `mandate_api/models/error.py` |

### client.receipts.verify_server_log

- **Route**: `GET /api/receipts/verify`
- **Signature**: `def verify_server_log(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `ChainResult`
- **Returns (raw)**: `ApiResult[ChainResult, RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `ChainResult` | `mandate_api/models/unions/chain_result.py` |

