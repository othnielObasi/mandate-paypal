using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<ActionEnum>))]
public sealed record ActionEnum : OpenStringEnum<ActionEnum>
{
    private ActionEnum(string value) : base(value)
    {
    }

    public static readonly ActionEnum Pause = new("pause");

    public static readonly ActionEnum Resume = new("resume");

    public static readonly ActionEnum Revoke = new("revoke");

    public TResult Match<TResult>(Func<TResult> onPause,
        Func<TResult> onResume,
        Func<TResult> onRevoke,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Pause => onPause(),
            _ when this == Resume => onResume(),
            _ when this == Revoke => onRevoke(),
            _ => otherwise(Value)
        };

    public void Match(Action onPause, Action onResume, Action onRevoke, Action<string> otherwise)
    {
        if (this == Pause) onPause();
        else if (this == Resume) onResume();
        else if (this == Revoke) onRevoke();
        else otherwise(Value);
    }
}
