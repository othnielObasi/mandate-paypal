using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Mode>))]
public sealed record Mode : OpenStringEnum<Mode>
{
    private Mode(string value) : base(value)
    {
    }

    public static readonly Mode HumanNotPresent = new("human_not_present");

    public static readonly Mode HumanPresent = new("human_present");

    public TResult Match<TResult>(Func<TResult> onHumanNotPresent,
        Func<TResult> onHumanPresent,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == HumanNotPresent => onHumanNotPresent(),
            _ when this == HumanPresent => onHumanPresent(),
            _ => otherwise(Value)
        };

    public void Match(Action onHumanNotPresent, Action onHumanPresent, Action<string> otherwise)
    {
        if (this == HumanNotPresent) onHumanNotPresent();
        else if (this == HumanPresent) onHumanPresent();
        else otherwise(Value);
    }
}
