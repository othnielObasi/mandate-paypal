using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Status>))]
public sealed record Status : OpenStringEnum<Status>
{
    private Status(string value) : base(value)
    {
    }

    public static readonly Status Active = new("active");

    public static readonly Status Paused = new("paused");

    public static readonly Status Revoked = new("revoked");

    public TResult Match<TResult>(Func<TResult> onActive,
        Func<TResult> onPaused,
        Func<TResult> onRevoked,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Active => onActive(),
            _ when this == Paused => onPaused(),
            _ when this == Revoked => onRevoked(),
            _ => otherwise(Value)
        };

    public void Match(Action onActive, Action onPaused, Action onRevoked, Action<string> otherwise)
    {
        if (this == Active) onActive();
        else if (this == Paused) onPaused();
        else if (this == Revoked) onRevoked();
        else otherwise(Value);
    }
}
