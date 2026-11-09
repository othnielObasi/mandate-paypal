<!-- Generated file — do not edit; regenerated with the SDK. -->

# Keys — operations

Accessor: `client.Keys` · Source: `src/MandateApi/Api/Keys.cs` · 3 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### GetAp2Jwks

- **Signature**: `GetAp2Jwks(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `Jwks`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `Jwks` | `src/MandateApi/Models/Jwks.cs` |

### GetReceiptPublicKey

- **Signature**: `GetReceiptPublicKey(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `void` (Task)
- **Error**: `ApiException<RawError>` — **Case B**

### GetTrust

- **Signature**: `GetTrust(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `Trust`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `Trust` | `src/MandateApi/Models/Trust.cs` |

