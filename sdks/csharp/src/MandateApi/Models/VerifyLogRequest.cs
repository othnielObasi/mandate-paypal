using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record VerifyLogRequest
{
    [JsonPropertyName("receipts")]
    [MaxLength(5000)]
    public required IReadOnlyList<Receipt> Receipts { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
