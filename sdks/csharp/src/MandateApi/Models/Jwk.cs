using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record Jwk
{
    [JsonPropertyName("kty")]
    public string Kty { get; } = "EC";

    [JsonPropertyName("crv")]
    public string Crv { get; } = "P-256";

    [JsonPropertyName("x")]
    public required string X { get; init; }

    [JsonPropertyName("y")]
    public required string Y { get; init; }

    [JsonPropertyName("kid")]
    public required string Kid { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("alg")]
    public Alg? Alg { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("use")]
    public Use? Use { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
