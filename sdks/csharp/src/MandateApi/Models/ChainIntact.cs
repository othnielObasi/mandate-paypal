using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record ChainIntact
{
    /// <summary>
    /// Always true for an intact chain
    /// </summary>
    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonPropertyName("count")]
    public required int Count { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
