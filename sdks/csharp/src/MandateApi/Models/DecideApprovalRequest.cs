using System.Text.Json.Serialization;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record DecideApprovalRequest
{
    [JsonPropertyName("choice")]
    public required Choice Choice { get; init; }

    /// <summary>
    /// A WebAuthn assertion over the approval's challenge (base64url fields).
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("passkey")]
    public PasskeyAssertion? Passkey { get; init; }
}
