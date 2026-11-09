using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

public record Ap2Evidence
{
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("spec")]
    public Spec? Spec { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("mode")]
    public string? Mode { get; init; }

    /// <summary>
    /// Merchant-signed UCP checkout (ES256 JWT)
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("checkoutJwt")]
    public string? CheckoutJwt { get; init; }

    /// <summary>
    /// Checkout Mandate SD-JWT chain
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("checkoutChain")]
    public string? CheckoutChain { get; init; }

    /// <summary>
    /// Payment Mandate SD-JWT chain
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paymentChain")]
    public string? PaymentChain { get; init; }

    /// <summary>
    /// Budget already used in the period, for the budget constraint
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("context")]
    public BudgetContext? Context { get; init; }

    /// <summary>
    /// Merchant receipt (ES256 JWT)
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("checkoutReceipt")]
    public string? CheckoutReceipt { get; init; }

    /// <summary>
    /// Payment gateway receipt with PayPal order and capture IDs (ES256 JWT)
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paymentReceipt")]
    public string? PaymentReceipt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("openCheckoutHash")]
    public string? OpenCheckoutHash { get; init; }

    /// <summary>
    /// WebAuthn assertion, present when the buyer approved on their device
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("passkey")]
    public object? Passkey { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
