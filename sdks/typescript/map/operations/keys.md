<!-- Generated file — do not edit; regenerated with the SDK. -->

# Keys — operations

Accessor: `client.keys` · Source: `src/resources/keys.ts` · 3 operations · Request types: namespace `Keys`

**Type sources**: every type an operation names, with the file that declares it and the schema value exported beside it. Import every name from `mandate-api`; the `Source` path is where to **read** the shape, never what to import. `ApiError`, the runtime error family and the file vocabulary are excluded — see sdk-map.md.

### getAp2Jwks

- **Signature**: `getAp2Jwks(options?: RequestOptions): ApiPromise<Jwks, ApiError>`
- **Wire**: `GET /api/ap2/jwks`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Jwks`
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `Jwks` | `jwksSchema` | `src/models/jwks.ts` |

### getReceiptPublicKey

- **Signature**: `getReceiptPublicKey(options?: RequestOptions): ApiPromise<undefined, ApiError>`
- **Wire**: `GET /api/public-key`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `undefined` — the operation resolves to nothing
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

### getTrust

- **Signature**: `getTrust(options?: RequestOptions): ApiPromise<Trust, ApiError>`
- **Wire**: `GET /api/trust`
- **Auth**: none — public; no credential is sent
- **Request body**: none — no `Content-Type` header is sent
- **Returns**: `Trust`
- **Error**: `MandateApiError` with `kind: "api"` — untyped, `payload.kind` always `"undeclared"`

| Type | Schema value | Source |
| --- | --- | --- |
| `Trust` | `trustSchema` | `src/models/trust.ts` |

