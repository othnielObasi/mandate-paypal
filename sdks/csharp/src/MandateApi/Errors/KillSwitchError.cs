using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class KillSwitchError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private KillSwitchError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static KillSwitchError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static KillSwitchError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<KillSwitchError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 or 401 or 404 or 503 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<KillSwitchError> Response { get; } = new(Create);
}
