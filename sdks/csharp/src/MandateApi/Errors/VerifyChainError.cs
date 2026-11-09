using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class VerifyChainError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private VerifyChainError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static VerifyChainError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static VerifyChainError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<VerifyChainError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<VerifyChainError> Response { get; } = new(Create);
}
