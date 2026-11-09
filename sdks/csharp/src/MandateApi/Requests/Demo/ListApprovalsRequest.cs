namespace MandateApi.Requests.Demo;

/// <summary>
/// The inputs of the ListApprovals operation.
/// </summary>
public sealed record ListApprovalsRequest
{
    /// <summary>
    /// Only this mandate's approvals. Omit for all.
    /// </summary>
    public string? MandateId { get; init; }
}
