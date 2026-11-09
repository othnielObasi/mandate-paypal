using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<MarketUnavailable>))]
public sealed record MarketUnavailable : OpenStringEnum<MarketUnavailable>
{
    private MarketUnavailable(string value) : base(value)
    {
    }

    public static readonly MarketUnavailable Ask = new("ask");

    public static readonly MarketUnavailable Block = new("block");

    public static readonly MarketUnavailable Allow = new("allow");

    public TResult Match<TResult>(Func<TResult> onAsk,
        Func<TResult> onBlock,
        Func<TResult> onAllow,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Ask => onAsk(),
            _ when this == Block => onBlock(),
            _ when this == Allow => onAllow(),
            _ => otherwise(Value)
        };

    public void Match(Action onAsk, Action onBlock, Action onAllow, Action<string> otherwise)
    {
        if (this == Ask) onAsk();
        else if (this == Block) onBlock();
        else if (this == Allow) onAllow();
        else otherwise(Value);
    }
}
