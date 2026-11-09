using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Servers;

[JsonConverter(typeof(StringEnumConverter<ServerEnvironment>))]
public sealed record ServerEnvironment : ClosedStringEnum<ServerEnvironment>
{
    private ServerEnvironment(string value) : base(value)
    {
    }

    /// <summary>
    /// Hosted demo (Render, PayPal sandbox)
    /// </summary>
    public static readonly ServerEnvironment Production = new("production");

    /// <summary>
    /// Local (npm run dev)
    /// </summary>
    public static readonly ServerEnvironment Local = new("local");

    public static ServerEnvironment Default() => Production;

    internal TResult Match<TResult>(Func<TResult> onProduction, Func<TResult> onLocal) =>
        this switch
        {
            _ when this == Production => onProduction(),
            _ when this == Local => onLocal(),
            _ => throw new InvalidOperationException($"{nameof(ServerEnvironment)} holds no known value.")
        };
}
