using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<StoppedBy>))]
public sealed record StoppedBy : OpenStringEnum<StoppedBy>
{
    private StoppedBy(string value) : base(value)
    {
    }

    public static readonly StoppedBy End = new("end");

    public static readonly StoppedBy StepLimit = new("step_limit");

    public static readonly StoppedBy ModelError = new("model_error");

    public TResult Match<TResult>(Func<TResult> onEnd,
        Func<TResult> onStepLimit,
        Func<TResult> onModelError,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == End => onEnd(),
            _ when this == StepLimit => onStepLimit(),
            _ when this == ModelError => onModelError(),
            _ => otherwise(Value)
        };

    public void Match(Action onEnd, Action onStepLimit, Action onModelError, Action<string> otherwise)
    {
        if (this == End) onEnd();
        else if (this == StepLimit) onStepLimit();
        else if (this == ModelError) onModelError();
        else otherwise(Value);
    }
}
