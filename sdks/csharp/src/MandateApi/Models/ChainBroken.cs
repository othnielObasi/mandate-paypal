using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record ChainBroken
{
    /// <summary>
    /// Always false for a broken chain
    /// </summary>
    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    /// <summary>
    /// seq of the first altered receipt
    /// </summary>
    [JsonPropertyName("brokenAt")]
    public required int BrokenAt { get; init; }

    [JsonPropertyName("reason")]
    public required Reason Reason { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
