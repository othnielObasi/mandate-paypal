using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record Ap2Verdict
{
    [JsonPropertyName("spec")]
    public string Spec { get; } = "ap2/0.2";

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paypalOrderId")]
    public string? PaypalOrderId { get; init; }

    /// <summary>
    /// Safe to fulfil only when true
    /// </summary>
    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mode")]
    public Mode? Mode { get; init; }

    /// <summary>
    /// checkout_signed, checkout_chain, checkout_hash, checkout_constraints, payment_chain,
    /// payment_matches_checkout, payment_constraints, checkout_receipt, payment_receipt,
    /// and passkey_approval when the buyer approved on their device.
    /// </summary>
    [JsonPropertyName("checks")]
    public required IReadOnlyList<Check> Checks { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("amount")]
    public Money? Amount { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("merchant")]
    public MerchantRef? Merchant { get; init; }

    [JsonPropertyName("evidence")]
    public required Ap2Evidence Evidence { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
