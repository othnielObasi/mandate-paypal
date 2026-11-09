using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record KillSwitchResult
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ok")]
    public bool? Ok { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("action")]
    public string? Action { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("status")]
    public Status? Status { get; init; }

    /// <summary>
    /// IDs of the mandates that changed
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("changed")]
    public IReadOnlyList<string>? Changed { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
