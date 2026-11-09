using System;
using System.Text.Json.Serialization;
using MandateApi.Core.Enum;

namespace MandateApi.Models.Enums;

[JsonConverter(typeof(StringEnumConverter<Storage>))]
public sealed record Storage : OpenStringEnum<Storage>
{
    private Storage(string value) : base(value)
    {
    }

    public static readonly Storage Postgres = new("postgres");

    public static readonly Storage Memory = new("memory");

    public TResult Match<TResult>(Func<TResult> onPostgres, Func<TResult> onMemory, Func<string, TResult> otherwise) =>
        this switch
        {
            _ when this == Postgres => onPostgres(),
            _ when this == Memory => onMemory(),
            _ => otherwise(Value)
        };

    public void Match(Action onPostgres, Action onMemory, Action<string> otherwise)
    {
        if (this == Postgres) onPostgres();
        else if (this == Memory) onMemory();
        else otherwise(Value);
    }
}
