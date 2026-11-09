using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<ModelProvider>))]
public sealed record ModelProvider : OpenStringEnum<ModelProvider>
{
    private ModelProvider(string value) : base(value)
    {
    }

    public static readonly ModelProvider MetaModelApi = new("Meta Model API");

    public static readonly ModelProvider ClaudeApi = new("Claude API");

    public static readonly ModelProvider Offline = new("offline");

    public TResult Match<TResult>(Func<TResult> onMetaModelApi,
        Func<TResult> onClaudeApi,
        Func<TResult> onOffline,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == MetaModelApi => onMetaModelApi(),
            _ when this == ClaudeApi => onClaudeApi(),
            _ when this == Offline => onOffline(),
            _ => otherwise(Value)
        };

    public void Match(Action onMetaModelApi, Action onClaudeApi, Action onOffline, Action<string> otherwise)
    {
        if (this == MetaModelApi) onMetaModelApi();
        else if (this == ClaudeApi) onClaudeApi();
        else if (this == Offline) onOffline();
        else otherwise(Value);
    }
}
