using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

/// <summary>
/// The signed log entry an event reports
/// </summary>
public record ReceiptRef
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("seq")]
    public int? Seq { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("hash")]
    public string? Hash { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
