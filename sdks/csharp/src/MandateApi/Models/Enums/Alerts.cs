using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Alerts>))]
public sealed record Alerts : OpenStringEnum<Alerts>
{
    private Alerts(string value) : base(value)
    {
    }

    public static readonly Alerts Zapier = new("zapier");

    public static readonly Alerts Off = new("off");

    public TResult Match<TResult>(Func<TResult> onZapier, Func<TResult> onOff, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Zapier => onZapier(),
            _ when this == Off => onOff(),
            _ => otherwise(Value)
        };

    public void Match(Action onZapier, Action onOff, Action<string> otherwise)
    {
        if (this == Zapier) onZapier();
        else if (this == Off) onOff();
        else otherwise(Value);
    }
}
