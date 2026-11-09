using System.Text.Json.Serialization;
using MandateApi.Core.Models;

namespace MandateApi.Models;

/// <summary>
/// Mandate v1 credentials (Ed25519 JWS). Post them to <c>/api/verify</c> to re-check.
/// </summary>
public record CredentialChain
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("intent")]
    public object? Intent { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("cart")]
    public object? Cart { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("payment")]
    public object? Payment { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
