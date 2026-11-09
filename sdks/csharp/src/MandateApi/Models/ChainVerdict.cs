using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record ChainVerdict
{
    [JsonPropertyName("ok")]
    public required bool Ok { get; init; }

    [JsonPropertyName("checks")]
    public required IReadOnlyList<Check> Checks { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("notes")]
    public IReadOnlyList<string>? Notes { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
