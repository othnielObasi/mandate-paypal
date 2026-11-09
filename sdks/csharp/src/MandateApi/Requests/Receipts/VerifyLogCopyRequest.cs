using MandateApi.Models;

namespace MandateApi.Requests.Receipts;

/// <summary>
/// The inputs of the VerifyLogCopy operation.
/// </summary>
public sealed record VerifyLogCopyRequest
{
    public required VerifyLogRequest Body { get; init; }
}
