using System.Text.Json.Serialization;

namespace MandateApi.Models;

/// <summary>
/// A WebAuthn assertion over the approval's challenge (base64url fields).
/// </summary>
public record PasskeyAssertion
{
    [JsonPropertyName("credentialId")]
    public required string CredentialId { get; init; }

    [JsonPropertyName("clientDataJSON")]
    public required string ClientDataJson { get; init; }

    [JsonPropertyName("authenticatorData")]
    public required string AuthenticatorData { get; init; }

    [JsonPropertyName("signature")]
    public required string Signature { get; init; }
}
