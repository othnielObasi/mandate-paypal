using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

/// <summary>
/// Budget already used in the period, for the budget constraint
/// </summary>
public record BudgetContext
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("totalAmount")]
    public int? TotalAmount { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("totalUses")]
    public int? TotalUses { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
