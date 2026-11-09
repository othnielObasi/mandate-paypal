<!-- Generated file — do not edit; regenerated with the SDK. -->

# Verification — operations

Accessor: `client.Verification` · Source: `src/MandateApi/Api/Verification.cs` · 4 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### GetAp2Evidence

- **Signature**: `GetAp2Evidence(GetAp2EvidenceRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `PaypalOrderId`
- **Returns**: `Ap2Verdict`
- **Error**: `ApiException<GetAp2EvidenceError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `GetAp2EvidenceRequest` | `src/MandateApi/Requests/Verification/GetAp2EvidenceRequest.cs` |
| `Ap2Verdict` | `src/MandateApi/Models/Ap2Verdict.cs` |
| `GetAp2EvidenceError` | `src/MandateApi/Errors/GetAp2EvidenceError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

### ListSellerPayments

- **Signature**: `ListSellerPayments(ListSellerPaymentsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Query params (wire ← C#)**: `merchantId` ← `MerchantId`
- **Returns**: `IReadOnlyList<SellerPayment>`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `ListSellerPaymentsRequest` | `src/MandateApi/Requests/Verification/ListSellerPaymentsRequest.cs` |
| `SellerPayment` | `src/MandateApi/Models/SellerPayment.cs` |

### VerifyChain

- **Signature**: `VerifyChain(VerifyChainOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `ChainVerdict`
- **Error**: `ApiException<VerifyChainError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `VerifyChainOperationRequest` | `src/MandateApi/Requests/Verification/VerifyChainOperationRequest.cs` |
| `VerifyChainRequest` | `src/MandateApi/Models/VerifyChainRequest.cs` |
| `ChainVerdict` | `src/MandateApi/Models/ChainVerdict.cs` |
| `VerifyChainError` | `src/MandateApi/Errors/VerifyChainError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

### VerifyOrder

- **Signature**: `VerifyOrder(VerifyOrderRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `PaypalOrderId`
- **Returns**: `OrderVerdict`
- **Error**: `ApiException<VerifyOrderError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [404] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `VerifyOrderRequest` | `src/MandateApi/Requests/Verification/VerifyOrderRequest.cs` |
| `OrderVerdict` | `src/MandateApi/Models/OrderVerdict.cs` |
| `VerifyOrderError` | `src/MandateApi/Errors/VerifyOrderError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

