using MandateApi.Models;

namespace MandateApi.Requests.Demo;

/// <summary>
/// The inputs of the RunAgent operation.
/// </summary>
public sealed record RunAgentOperationRequest
{
    public required RunAgentRequest Body { get; init; }
}
