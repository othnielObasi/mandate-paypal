using System.Text.Json.Serialization;

namespace MandateApi.Models;

public record VerifyChainRequest
{
    /// <summary>
    /// Intent Mandate as returned in <c>chain.intent</c>
    /// </summary>
    [JsonPropertyName("intent")]
    public required object Intent { get; init; }

    /// <summary>
    /// Cart Mandate as returned in <c>chain.cart</c>
    /// </summary>
    [JsonPropertyName("cart")]
    public required object Cart { get; init; }

    /// <summary>
    /// Payment Mandate as returned in <c>chain.payment</c>
    /// </summary>
    [JsonPropertyName("payment")]
    public required object Payment { get; init; }
}
