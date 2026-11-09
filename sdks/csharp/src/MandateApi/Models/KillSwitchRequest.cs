using System.Text.Json.Serialization;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record KillSwitchRequest
{
    [JsonPropertyName("action")]
    public required ActionEnum Action { get; init; }

    /// <summary>
    /// Only this mandate. Omit for all of the user's mandates.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mandateId")]
    public string? MandateId { get; init; }
}
