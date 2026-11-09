using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MandateApi.Models;

public record RunAgentRequest
{
    [JsonPropertyName("mandateId")]
    public required string MandateId { get; init; }

    [JsonPropertyName("task")]
    [MaxLength(500)]
    public required string Task { get; init; }

    /// <summary>
    /// Compromised-agent drill: a planner that obeys product pages.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("drill")]
    public bool? Drill { get; init; }

    /// <summary>
    /// Stream NDJSON
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("stream")]
    public bool? Stream { get; init; }
}
