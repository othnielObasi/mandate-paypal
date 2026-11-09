namespace MandateApi.Requests.Verification;

/// <summary>
/// The inputs of the GetAp2Evidence operation.
/// </summary>
public sealed record GetAp2EvidenceRequest
{
    /// <summary>
    /// PayPal order ID (sandbox), or <c>SIM-…</c> in offline mode.
    /// </summary>
    public required string PaypalOrderId { get; init; }
}
