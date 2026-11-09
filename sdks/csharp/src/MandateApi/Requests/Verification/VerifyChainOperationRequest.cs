using MandateApi.Models;

namespace MandateApi.Requests.Verification;

/// <summary>
/// The inputs of the VerifyChain operation.
/// </summary>
public sealed record VerifyChainOperationRequest
{
    public required VerifyChainRequest Body { get; init; }
}
