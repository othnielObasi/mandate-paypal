using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

/// <summary>
/// KERNEL cloud browser, or only the app's own /demo pages
/// </summary>
[JsonConverter(typeof(StringEnumConverter<Web>))]
public sealed record Web : OpenStringEnum<Web>
{
    private Web(string value) : base(value)
    {
    }

    public static readonly Web Kernel = new("kernel");

    public static readonly Web OwnPages = new("own-pages");

    public TResult Match<TResult>(Func<TResult> onKernel, Func<TResult> onOwnPages, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Kernel => onKernel(),
            _ when this == OwnPages => onOwnPages(),
            _ => otherwise(Value)
        };

    public void Match(Action onKernel, Action onOwnPages, Action<string> otherwise)
    {
        if (this == Kernel) onKernel();
        else if (this == OwnPages) onOwnPages();
        else otherwise(Value);
    }
}
