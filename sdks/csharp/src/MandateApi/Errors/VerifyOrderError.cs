using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class VerifyOrderError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private VerifyOrderError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static VerifyOrderError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static VerifyOrderError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<VerifyOrderError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            404 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<VerifyOrderError> Response { get; } = new(Create);
}
