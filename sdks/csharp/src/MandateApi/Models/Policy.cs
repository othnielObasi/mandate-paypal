using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

/// <summary>
/// The signed rules. Money is in minor units (cents).
/// </summary>
public record Policy
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("categories")]
    public IReadOnlyList<string>? Categories { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("currency")]
    public string? Currency { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("maxItemMinor")]
    public int? MaxItemMinor { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("budget")]
    public Budget? Budget { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("sellers")]
    public SellerRules? Sellers { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("overLimit")]
    public OverLimit? OverLimit { get; init; }

    /// <summary>
    /// Fair-price limit, % above market
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("maxPremiumPct")]
    public int? MaxPremiumPct { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("marketUnavailable")]
    public MarketUnavailable? MarketUnavailable { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("expires")]
    public DateTimeOffset? Expires { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
