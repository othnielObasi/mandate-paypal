using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Outcome>))]
public sealed record Outcome : OpenStringEnum<Outcome>
{
    private Outcome(string value) : base(value)
    {
    }

    public static readonly Outcome Allow = new("allow");

    public static readonly Outcome Approve = new("approve");

    public static readonly Outcome Block = new("block");

    public TResult Match<TResult>(Func<TResult> onAllow,
        Func<TResult> onApprove,
        Func<TResult> onBlock,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Allow => onAllow(),
            _ when this == Approve => onApprove(),
            _ when this == Block => onBlock(),
            _ => otherwise(Value)
        };

    public void Match(Action onAllow, Action onApprove, Action onBlock, Action<string> otherwise)
    {
        if (this == Allow) onAllow();
        else if (this == Approve) onApprove();
        else if (this == Block) onBlock();
        else otherwise(Value);
    }
}
