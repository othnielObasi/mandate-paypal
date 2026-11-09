using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<OverLimit>))]
public sealed record OverLimit : OpenStringEnum<OverLimit>
{
    private OverLimit(string value) : base(value)
    {
    }

    public static readonly OverLimit Ask = new("ask");

    public static readonly OverLimit Block = new("block");

    public TResult Match<TResult>(Func<TResult> onAsk, Func<TResult> onBlock, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Ask => onAsk(),
            _ when this == Block => onBlock(),
            _ => otherwise(Value)
        };

    public void Match(Action onAsk, Action onBlock, Action<string> otherwise)
    {
        if (this == Ask) onAsk();
        else if (this == Block) onBlock();
        else otherwise(Value);
    }
}
