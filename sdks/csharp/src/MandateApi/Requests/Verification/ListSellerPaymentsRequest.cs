namespace MandateApi.Requests.Verification;

/// <summary>
/// The inputs of the ListSellerPayments operation.
/// </summary>
public sealed record ListSellerPaymentsRequest
{
    /// <summary>
    /// Only this merchant's payments. Omit for all.
    /// </summary>
    public string? MerchantId { get; init; }
}
