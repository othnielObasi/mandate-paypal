using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Reason>))]
public sealed record Reason : OpenStringEnum<Reason>
{
    private Reason(string value) : base(value)
    {
    }

    public static readonly Reason SequenceGap = new("sequence_gap");

    public static readonly Reason ChainBreak = new("chain_break");

    public static readonly Reason PayloadMismatch = new("payload_mismatch");

    public static readonly Reason HashMismatch = new("hash_mismatch");

    public static readonly Reason BadSignature = new("bad_signature");

    public TResult Match<TResult>(Func<TResult> onSequenceGap,
        Func<TResult> onChainBreak,
        Func<TResult> onPayloadMismatch,
        Func<TResult> onHashMismatch,
        Func<TResult> onBadSignature,
        Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == SequenceGap => onSequenceGap(),
            _ when this == ChainBreak => onChainBreak(),
            _ when this == PayloadMismatch => onPayloadMismatch(),
            _ when this == HashMismatch => onHashMismatch(),
            _ when this == BadSignature => onBadSignature(),
            _ => otherwise(Value)
        };

    public void Match(Action onSequenceGap,
        Action onChainBreak,
        Action onPayloadMismatch,
        Action onHashMismatch,
        Action onBadSignature,
        Action<string> otherwise)
    {
        if (this == SequenceGap) onSequenceGap();
        else if (this == ChainBreak) onChainBreak();
        else if (this == PayloadMismatch) onPayloadMismatch();
        else if (this == HashMismatch) onHashMismatch();
        else if (this == BadSignature) onBadSignature();
        else otherwise(Value);
    }
}
