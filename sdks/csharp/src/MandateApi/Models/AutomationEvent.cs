using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Models;
using MandateApi.Models.Enums;

namespace MandateApi.Models;

/// <summary>
/// What Mandate posts to the Zapier Catch Hook. Flat, so every field maps straight into a Zap step.
/// </summary>
public record AutomationEvent
{
    [JsonPropertyName("event")]
    public required Event Event { get; init; }

    /// <summary>
    /// One line for an SMS, email subject or Slack message
    /// </summary>
    [JsonPropertyName("message")]
    public required string Message { get; init; }

    [JsonPropertyName("mandateId")]
    public required string MandateId { get; init; }

    [JsonPropertyName("at")]
    public required DateTimeOffset At { get; init; }

    /// <summary>
    /// Where to act (the app), or the payment's public verdict
    /// </summary>
    [JsonPropertyName("link")]
    public required string Link { get; init; }

    /// <summary>
    /// The signed log entry an event reports
    /// </summary>
    [JsonPropertyName("receipt")]
    public required ReceiptRef Receipt { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("approvalId")]
    public string? ApprovalId { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("paypalOrderId")]
    public string? PaypalOrderId { get; init; }

    /// <summary>
    /// The rule that blocked the purchase
    /// </summary>
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("rule")]
    public string? Rule { get; init; }

    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    [JsonPropertyName("status")]
    public Status? Status { get; init; }

    [JsonExtensionData]
    public AdditionalProperties AdditionalProperties { get; init; } = [];
}
