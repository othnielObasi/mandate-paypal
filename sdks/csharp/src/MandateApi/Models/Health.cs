using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record Health
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("ok")]
    public bool? Ok { get; init; }

    /// <summary>
    /// <c>paypal-agent-toolkit</c> with sandbox keys, else <c>simulated</c>
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("provider")]
    public string? Provider { get; init; }

    /// <summary>
    /// Model ID (muse-spark-1.3, claude-sonnet-5-5…), or <c>offline-planner</c>
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("model")]
    public string? Model { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("modelProvider")]
    public ModelProvider? ModelProvider { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("signingKey")]
    public SigningKey? SigningKey { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("storage")]
    public Storage? Storage { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("market")]
    public string? Market { get; init; }

    /// <summary>
    /// KERNEL cloud browser, or only the app's own /demo pages
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("web")]
    public Web? Web { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("automation")]
    public AutomationStatus? Automation { get; init; }

    /// <summary>
    /// Always true. Mandate never moves real money.
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("sandboxOnly")]
    public bool? SandboxOnly { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
