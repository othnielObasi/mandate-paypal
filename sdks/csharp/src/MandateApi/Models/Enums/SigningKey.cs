using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<SigningKey>))]
public sealed record SigningKey : OpenStringEnum<SigningKey>
{
    private SigningKey(string value) : base(value)
    {
    }

    public static readonly SigningKey Configured = new("configured");

    public static readonly SigningKey Ephemeral = new("ephemeral");

    public TResult Match<TResult>(Func<TResult> onConfigured,
        Func<TResult> onEphemeral,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Configured => onConfigured(),
            _ when this == Ephemeral => onEphemeral(),
            _ => otherwise(Value)
        };

    public void Match(Action onConfigured, Action onEphemeral, Action<string> otherwise)
    {
        if (this == Configured) onConfigured();
        else if (this == Ephemeral) onEphemeral();
        else otherwise(Value);
    }
}
