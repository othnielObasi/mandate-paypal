<!-- Generated file — do not edit; regenerated with the SDK. -->

# Demo — operations

Accessor: `client.Demo` · Source: `src/MandateApi/Api/Demo.cs` · 6 operations

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### CreateMandate

- **Signature**: `CreateMandate(CreateMandateOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `Mandate`
- **Error**: `ApiException<CreateMandateError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 422, 429] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `CreateMandateOperationRequest` | `src/MandateApi/Requests/Demo/CreateMandateOperationRequest.cs` |
| `CreateMandateRequest` | `src/MandateApi/Models/CreateMandateRequest.cs` |
| `Mandate` | `src/MandateApi/Models/Mandate.cs` |
| `CreateMandateError` | `src/MandateApi/Errors/CreateMandateError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

### DecideApproval

- **Signature**: `DecideApproval(DecideApprovalOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Id`, `Body`
- **Returns**: `ProposeResult`
- **Error**: `ApiException<DecideApprovalError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [403, 404, 409, 410] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `DecideApprovalOperationRequest` | `src/MandateApi/Requests/Demo/DecideApprovalOperationRequest.cs` |
| `DecideApprovalRequest` | `src/MandateApi/Models/DecideApprovalRequest.cs` |
| `ProposeResult` | `src/MandateApi/Models/ProposeResult.cs` |
| `DecideApprovalError` | `src/MandateApi/Errors/DecideApprovalError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

### GetHealth

- **Signature**: `GetHealth(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `Health`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `Health` | `src/MandateApi/Models/Health.cs` |

### ListApprovals

- **Signature**: `ListApprovals(ListApprovalsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Query params (wire ← C#)**: `mandateId` ← `MandateId`
- **Returns**: `IReadOnlyList<Approval>`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `ListApprovalsRequest` | `src/MandateApi/Requests/Demo/ListApprovalsRequest.cs` |
| `Approval` | `src/MandateApi/Models/Approval.cs` |

### ListMandates

- **Signature**: `ListMandates(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
- **Returns**: `IReadOnlyList<Mandate>`
- **Error**: `ApiException<RawError>` — **Case B**

| Type | Source |
| --- | --- |
| `Mandate` | `src/MandateApi/Models/Mandate.cs` |

### RunAgent

- **Signature**: `RunAgent(RunAgentOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `AgentRun`
- **Error**: `ApiException<RunAgentError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [404, 429] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `RunAgentOperationRequest` | `src/MandateApi/Requests/Demo/RunAgentOperationRequest.cs` |
| `RunAgentRequest` | `src/MandateApi/Models/RunAgentRequest.cs` |
| `AgentRun` | `src/MandateApi/Models/AgentRun.cs` |
| `RunAgentError` | `src/MandateApi/Errors/RunAgentError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

