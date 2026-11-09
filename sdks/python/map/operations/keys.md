<!-- Generated file — do not edit; regenerated with the SDK. -->

# Keys — operations

Accessor: `client.keys` · Source: `mandate_api/apis/keys.py` · 3 operations

Each `###` block is one operation and assumes `sdk-map.md` is loaded: blocks omit what its invariants table covers and are otherwise self-contained, so chunk at block level. Signatures are the sync parsed spelling; the async and raw spellings take the same parameters (see sdk-map.md). **Type sources** names the module declaring each type an operation mentions, so resolving a body, return or error payload is a lookup rather than a search; the runtime types `RawError` and `ApiResult` are excluded, and an operation with no table mentions nothing but builtins and those.

### client.keys.get_ap2_jwks

- **Route**: `GET /api/ap2/jwks`
- **Signature**: `def get_ap2_jwks(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `Jwks`
- **Returns (raw)**: `ApiResult[Jwks, RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Jwks` | `mandate_api/models/jwks.py` |

### client.keys.get_receipt_public_key

- **Route**: `GET /api/public-key`
- **Signature**: `def get_receipt_public_key(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `None`
- **Returns (raw)**: `ApiResult[None, RawError]`
- **Error**: `RawError` — **Case B**

### client.keys.get_trust

- **Route**: `GET /api/trust`
- **Signature**: `def get_trust(*, request_options: RequestOptionsOrDict | None = None)`
- **Returns (parsed)**: `Trust`
- **Returns (raw)**: `ApiResult[Trust, RawError]`
- **Error**: `RawError` — **Case B**

| Type | Source |
| --- | --- |
| `Trust` | `mandate_api/models/trust.py` |

