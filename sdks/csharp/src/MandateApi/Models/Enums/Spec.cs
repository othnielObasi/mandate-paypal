using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Spec>))]
public sealed record Spec : OpenStringEnum<Spec>
{
    private Spec(string value) : base(value)
    {
    }

    public static readonly Spec Ap202 = new("ap2/0.2");

    public TResult Match<TResult>(Func<TResult> onAp202, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Ap202 => onAp202(),
            _ => otherwise(Value)
        };

    public void Match(Action onAp202, Action<string> otherwise)
    {
        if (this == Ap202) onAp202();
        else otherwise(Value);
    }
}
