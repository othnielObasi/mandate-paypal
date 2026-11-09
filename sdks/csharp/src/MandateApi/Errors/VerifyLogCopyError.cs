using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class VerifyLogCopyError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private VerifyLogCopyError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static VerifyLogCopyError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static VerifyLogCopyError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<VerifyLogCopyError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<VerifyLogCopyError> Response { get; } = new(Create);
}
