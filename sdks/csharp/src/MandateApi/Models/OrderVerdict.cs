using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record OrderVerdict
{
    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonPropertyName("checks")]
    public required IReadOnlyList<Check> Checks { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("notes")]
    public IReadOnlyList<string>? Notes { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paypalOrderId")]
    public string? PaypalOrderId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paymentMandateId")]
    public string? PaymentMandateId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mode")]
    public Mode? Mode { get; init; }

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
    /// Mandate v1 credentials (Ed25519 JWS). Post them to <c>/api/verify</c> to re-check.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("chain")]
    public CredentialChain? Chain { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ap2")]
    public Ap2Verdict? Ap2 { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
