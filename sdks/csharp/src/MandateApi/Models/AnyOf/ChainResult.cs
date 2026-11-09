using System;
using System.Text.Json;
using System.Text.Json.Serialization;
using MandateApi.Core.Extensions;
using MandateApi.Core.Models;

namespace MandateApi.Models.AnyOf;

[JsonConverter(typeof(ChainResultConverter))]
public record ChainResult
{
    private readonly Optional<ChainIntact> _chainIntactValue;

    private readonly Optional<ChainBroken> _chainBrokenValue;

    private ChainResult(Optional<ChainIntact> chainIntactValue, Optional<ChainBroken> chainBrokenValue)
    {
        _chainIntactValue = chainIntactValue;
        _chainBrokenValue = chainBrokenValue;
    }

    public static ChainResult ChainIntact(ChainIntact value) => new(Optional<ChainIntact>.Some(value), default);

    public static ChainResult ChainBroken(ChainBroken value) => new(default, Optional<ChainBroken>.Some(value));

    public bool TryGetChainIntact(out ChainIntact value) => _chainIntactValue.TryGetValue(out value);

    public bool TryGetChainBroken(out ChainBroken value) => _chainBrokenValue.TryGetValue(out value);

    public static implicit operator ChainResult(ChainIntact value) => ChainIntact(value);

    public static implicit operator ChainResult(ChainBroken value) => ChainBroken(value);
}

file sealed class ChainResultConverter : JsonConverter<ChainResult>
{
    public override ChainResult Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var doc = JsonDocument.ParseValue(ref reader);
        var root = doc.RootElement;
        if (JsonSerializer.TryDeserialize<ChainIntact>(root, options, out var chainIntactValue))
        {
            return ChainResult.ChainIntact(chainIntactValue);
        }
        if (JsonSerializer.TryDeserialize<ChainBroken>(root, options, out var chainBrokenValue))
        {
            return ChainResult.ChainBroken(chainBrokenValue);
        }
        throw new JsonException($"JSON does not match ChainIntact or ChainBroken schemas: {root.ToString()}");
    }

    public override void Write(Utf8JsonWriter writer, ChainResult value, JsonSerializerOptions options)
    {
        if (value.TryGetChainIntact(out var chainIntactValue))
        {
            JsonSerializer.Serialize(writer, chainIntactValue, options);
        }
        else if (value.TryGetChainBroken(out var chainBrokenValue))
        {
            JsonSerializer.Serialize(writer, chainBrokenValue, options);
        }
        else
        {
            throw new JsonException($"{nameof(ChainResult)} contains no valid value to serialize.");
        }
    }
}
