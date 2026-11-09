using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<KillSwitch>))]
public sealed record KillSwitch : OpenStringEnum<KillSwitch>
{
    private KillSwitch(string value) : base(value)
    {
    }

    public static readonly KillSwitch On = new("on");

    public static readonly KillSwitch Off = new("off");

    public TResult Match<TResult>(Func<TResult> onOn, Func<TResult> onOff, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == On => onOn(),
            _ when this == Off => onOff(),
            _ => otherwise(Value)
        };

    public void Match(Action onOn, Action onOff, Action<string> otherwise)
    {
        if (this == On) onOn();
        else if (this == Off) onOff();
        else otherwise(Value);
    }
}
