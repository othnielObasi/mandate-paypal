using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record SellerPaymentDetails
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paypalOrderId")]
    public string? PaypalOrderId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paymentMandateId")]
    public string? PaymentMandateId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mode")]
    public string? Mode { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("merchant")]
    public string? Merchant { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("total")]
    public string? Total { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("items")]
    public IReadOnlyList<string>? Items { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("createdAt")]
    public DateTimeOffset? CreatedAt { get; init; }

    /// <summary>
    /// AP2 v0.2 verdict, null if no AP2 evidence
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ap2")]
    public bool? Ap2 { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
