using MandateApi.Models;

namespace MandateApi.Requests.Demo;

/// <summary>
/// The inputs of the CreateMandate operation.
/// </summary>
public sealed record CreateMandateOperationRequest
{
    public required CreateMandateRequest Body { get; init; }
}
