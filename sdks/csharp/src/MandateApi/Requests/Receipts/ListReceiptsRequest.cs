namespace MandateApi.Requests.Receipts;

/// <summary>
/// The inputs of the ListReceipts operation.
/// </summary>
public sealed record ListReceiptsRequest
{
    /// <summary>
    /// Only this mandate's receipts. Omit for the whole log.
    /// </summary>
    public string? MandateId { get; init; }
}
