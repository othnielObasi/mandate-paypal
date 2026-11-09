using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Period>))]
public sealed record Period : OpenStringEnum<Period>
{
    private Period(string value) : base(value)
    {
    }

    public static readonly Period Week = new("week");

    public static readonly Period Month = new("month");

    public TResult Match<TResult>(Func<TResult> onWeek, Func<TResult> onMonth, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Week => onWeek(),
            _ when this == Month => onMonth(),
            _ => otherwise(Value)
        };

    public void Match(Action onWeek, Action onMonth, Action<string> otherwise)
    {
        if (this == Week) onWeek();
        else if (this == Month) onMonth();
        else otherwise(Value);
    }
}
