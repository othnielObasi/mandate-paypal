using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Event>))]
public sealed record Event : OpenStringEnum<Event>
{
    private Event(string value) : base(value)
    {
    }

    public static readonly Event ApprovalNeeded = new("approval.needed");

    public static readonly Event PurchaseBlocked = new("purchase.blocked");

    public static readonly Event PurchasePaid = new("purchase.paid");

    public static readonly Event PaymentFailed = new("payment.failed");

    public static readonly Event MandateStatusChanged = new("mandate.status_changed");

    public TResult Match<TResult>(Func<TResult> onApprovalNeeded,
        Func<TResult> onPurchaseBlocked,
        Func<TResult> onPurchasePaid,
        Func<TResult> onPaymentFailed,
        Func<TResult> onMandateStatusChanged,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == ApprovalNeeded => onApprovalNeeded(),
            _ when this == PurchaseBlocked => onPurchaseBlocked(),
            _ when this == PurchasePaid => onPurchasePaid(),
            _ when this == PaymentFailed => onPaymentFailed(),
            _ when this == MandateStatusChanged => onMandateStatusChanged(),
            _ => otherwise(Value)
        };

    public void Match(Action onApprovalNeeded,
        Action onPurchaseBlocked,
        Action onPurchasePaid,
        Action onPaymentFailed,
        Action onMandateStatusChanged,
        Action<string> otherwise)
    {
        if (this == ApprovalNeeded) onApprovalNeeded();
        else if (this == PurchaseBlocked) onPurchaseBlocked();
        else if (this == PurchasePaid) onPurchasePaid();
        else if (this == PaymentFailed) onPaymentFailed();
        else if (this == MandateStatusChanged) onMandateStatusChanged();
        else otherwise(Value);
    }
}
