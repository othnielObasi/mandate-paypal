using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace MandateApi.Models;

public record CreateMandateRequest
{
    /// <summary>
    /// The rules in plain English
    /// </summary>
    [JsonPropertyName("text")]
    [MaxLength(2000)]
    public required string Text { get; init; }

    /// <summary>
    /// The signed rules. Money is in minor units (cents).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("policy")]
    public Policy? Policy { get; init; }
}
