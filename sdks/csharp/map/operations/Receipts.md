<!-- Generated file — do not edit; regenerated with the SDK. -->

# Receipts — operations

Accessor: `client.Receipts` · Source: `src/MandateApi/Api/Receipts.cs` · 3 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### ListReceipts

- **Signature**: `ListReceipts(ListReceiptsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Query params (wire ← C#)**: `mandateId` ← `MandateId`
- **Returns**: `IReadOnlyList<Receipt>`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `ListReceiptsRequest` | `src/MandateApi/Requests/Receipts/ListReceiptsRequest.cs` |
| `Receipt` | `src/MandateApi/Models/Receipt.cs` |

### VerifyLogCopy

- **Signature**: `VerifyLogCopy(VerifyLogCopyRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `ChainResult`
- **Error**: `ApiException<VerifyLogCopyError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `VerifyLogCopyRequest` | `src/MandateApi/Requests/Receipts/VerifyLogCopyRequest.cs` |
| `VerifyLogRequest` | `src/MandateApi/Models/VerifyLogRequest.cs` |
| `ChainResult` | `src/MandateApi/Models/AnyOf/ChainResult.cs` |
| `VerifyLogCopyError` | `src/MandateApi/Errors/VerifyLogCopyError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

### VerifyServerLog

- **Signature**: `VerifyServerLog(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `ChainResult`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `ChainResult` | `src/MandateApi/Models/AnyOf/ChainResult.cs` |

