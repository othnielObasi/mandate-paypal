using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Choice>))]
public sealed record Choice : OpenStringEnum<Choice>
{
    private Choice(string value) : base(value)
    {
    }

    public static readonly Choice Approve = new("approve");

    public static readonly Choice Decline = new("decline");

    public TResult Match<TResult>(Func<TResult> onApprove, Func<TResult> onDecline, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Approve => onApprove(),
            _ when this == Decline => onDecline(),
            _ => otherwise(Value)
        };

    public void Match(Action onApprove, Action onDecline, Action<string> otherwise)
    {
        if (this == Approve) onApprove();
        else if (this == Decline) onDecline();
        else otherwise(Value);
    }
}
