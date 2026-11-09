<!-- Generated file — do not edit; regenerated with the SDK. -->

# Automation — operations

Accessor: `client.Automation` · Source: `src/MandateApi/Api/Automation.cs` · 1 operation

**Type sources**: the file declaring each type an operation names (`RawError` excluded — see sdk-map.md).

### KillSwitch

- **Auth**: `options.AutomationSecret`
- **Signature**: `KillSwitch(KillSwitchOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default)`
  - required: `Body`
- **Returns**: `KillSwitchResult`
- **Error**: `ApiException<KillSwitchError>` — **Case A (typed)**
- **Error accessors**: `TryGetError(out Error)` [400, 401, 404, 503] · `TryGetRawError(out RawError)` [fallback]

| Type | Source |
| --- | --- |
| `KillSwitchOperationRequest` | `src/MandateApi/Requests/Automation/KillSwitchOperationRequest.cs` |
| `KillSwitchRequest` | `src/MandateApi/Models/KillSwitchRequest.cs` |
| `KillSwitchResult` | `src/MandateApi/Models/KillSwitchResult.cs` |
| `KillSwitchError` | `src/MandateApi/Errors/KillSwitchError.cs` |
| `Error` | `src/MandateApi/Models/Error.cs` |

