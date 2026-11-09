using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Alg>))]
public sealed record Alg : OpenStringEnum<Alg>
{
    private Alg(string value) : base(value)
    {
    }

    public static readonly Alg Es256 = new("ES256");

    public TResult Match<TResult>(Func<TResult> onEs256, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Es256 => onEs256(),
            _ => otherwise(Value)
        };

    public void Match(Action onEs256, Action<string> otherwise)
    {
        if (this == Es256) onEs256();
        else otherwise(Value);
    }
}
