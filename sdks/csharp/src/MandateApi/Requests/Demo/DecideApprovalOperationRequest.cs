using MandateApi.Models;

namespace MandateApi.Requests.Demo;

/// <summary>
/// The inputs of the DecideApproval operation.
/// </summary>
public sealed record DecideApprovalOperationRequest
{
    /// <summary>
    /// The approval ID from <c>listApprovals</c> or the agent run.
    /// </summary>
    public required string Id { get; init; }

    public required DecideApprovalRequest Body { get; init; }
}
