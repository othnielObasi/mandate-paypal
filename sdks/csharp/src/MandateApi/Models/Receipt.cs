using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

public record Receipt
{
    [JsonPropertyName("seq")]
    public required int Seq { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mandateId")]
    public string? MandateId { get; init; }

    [JsonPropertyName("type")]
    public required string Type { get; init; }

    [JsonPropertyName("summary")]
    public required string Summary { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("payload")]
    public object? Payload { get; init; }

    [JsonPropertyName("payloadHash")]
    public required string PayloadHash { get; init; }

    [JsonPropertyName("createdAt")]
    public required DateTimeOffset CreatedAt { get; init; }

    [JsonPropertyName("prevHash")]
    public required string PrevHash { get; init; }

    [JsonPropertyName("hash")]
    public required string Hash { get; init; }

    /// <summary>
    /// Ed25519 over <c>hash</c>, verify with /api/public-key
    /// </summary>
    [JsonPropertyName("signature")]
    public required string Signature { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
