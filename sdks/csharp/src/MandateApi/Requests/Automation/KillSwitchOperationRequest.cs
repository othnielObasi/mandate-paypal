using MandateApi.Models;

namespace MandateApi.Requests.Automation;

/// <summary>
/// The inputs of the KillSwitch operation.
/// </summary>
public sealed record KillSwitchOperationRequest
{
    public required KillSwitchRequest Body { get; init; }
}
