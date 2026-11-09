using System.Collections.Generic;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record AgentRun
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("final")]
    public string? Final { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("stoppedBy")]
    public StoppedBy? StoppedBy { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("events")]
    public IReadOnlyList<AgentEvent>? Events { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
