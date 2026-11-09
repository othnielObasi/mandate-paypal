using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record ErrorError
{
    [JsonPropertyName("error")]
    public required string Error { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
