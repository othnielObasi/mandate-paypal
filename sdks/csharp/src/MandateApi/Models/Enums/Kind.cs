using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Kind>))]
public sealed record Kind : OpenStringEnum<Kind>
{
    private Kind(string value) : base(value)
    {
    }

    public static readonly Kind Text = new("text");

    public static readonly Kind Tool = new("tool");

    public TResult Match<TResult>(Func<TResult> onText, Func<TResult> onTool, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Text => onText(),
            _ when this == Tool => onTool(),
            _ => otherwise(Value)
        };

    public void Match(Action onText, Action onTool, Action<string> otherwise)
    {
        if (this == Text) onText();
        else if (this == Tool) onTool();
        else otherwise(Value);
    }
}
