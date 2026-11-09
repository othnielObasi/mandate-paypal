using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record Error
{
    [JsonPropertyName("error")]
    public required string ErrorValue { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
