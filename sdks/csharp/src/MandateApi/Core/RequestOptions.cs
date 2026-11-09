using System.Collections.Generic;
using Microsoft.Extensions.Logging;
using MandateApi.Core.Hooks;
using MandateApi.Core.Models;

namespace MandateApi.Core;

public sealed record RequestOptions
{
    public LogLevel? LogLevel { get; init; }

    public IReadOnlyList<HeaderParam>? Headers { get; init; }

    public IReadOnlyList<SdkHook>? Hooks { get; init; }
}
