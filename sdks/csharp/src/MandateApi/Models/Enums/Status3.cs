using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Status3>))]
public sealed record Status3 : OpenStringEnum<Status3>
{
    private Status3(string value) : base(value)
    {
    }

    public static readonly Status3 Paid = new("paid");

    public static readonly Status3 AwaitingBuyer = new("awaiting_buyer");

    public static readonly Status3 PendingApproval = new("pending_approval");

    public static readonly Status3 Blocked = new("blocked");

    public static readonly Status3 Declined = new("declined");

    public static readonly Status3 Failed = new("failed");

    public TResult Match<TResult>(Func<TResult> onPaid,
        Func<TResult> onAwaitingBuyer,
        Func<TResult> onPendingApproval,
        Func<TResult> onBlocked,
        Func<TResult> onDeclined,
        Func<TResult> onFailed,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Paid => onPaid(),
            _ when this == AwaitingBuyer => onAwaitingBuyer(),
            _ when this == PendingApproval => onPendingApproval(),
            _ when this == Blocked => onBlocked(),
            _ when this == Declined => onDeclined(),
            _ when this == Failed => onFailed(),
            _ => otherwise(Value)
        };

    public void Match(Action onPaid,
        Action onAwaitingBuyer,
        Action onPendingApproval,
        Action onBlocked,
        Action onDeclined,
        Action onFailed,
        Action<string> otherwise)
    {
        if (this == Paid) onPaid();
        else if (this == AwaitingBuyer) onAwaitingBuyer();
        else if (this == PendingApproval) onPendingApproval();
        else if (this == Blocked) onBlocked();
        else if (this == Declined) onDeclined();
        else if (this == Failed) onFailed();
        else otherwise(Value);
    }
}
