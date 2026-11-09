using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record Jwks
{
    [JsonPropertyName("keys")]
    public required IReadOnlyList<Jwk> Keys { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
