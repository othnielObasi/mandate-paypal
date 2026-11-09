using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record Check
{
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    [JsonPropertyName("label")]
    public required string Label { get; init; }

    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonPropertyName("detail")]
    public required string Detail { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
