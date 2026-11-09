namespace MandateApi.Requests.Verification;

/// <summary>
/// The inputs of the VerifyOrder operation.
/// </summary>
public sealed record VerifyOrderRequest
{
    /// <summary>
    /// PayPal order ID (sandbox), or <c>SIM-…</c> in offline mode.
    /// </summary>
    public required string PaypalOrderId { get; init; }
}
