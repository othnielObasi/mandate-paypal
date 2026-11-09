using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Use>))]
public sealed record Use : OpenStringEnum<Use>
{
    private Use(string value) : base(value)
    {
    }

    public static readonly Use Sig = new("sig");

    public TResult Match<TResult>(Func<TResult> onSig, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Sig => onSig(),
            _ => otherwise(Value)
        };

    public void Match(Action onSig, Action<string> otherwise)
    {
        if (this == Sig) onSig();
        else otherwise(Value);
    }
}
