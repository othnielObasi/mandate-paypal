using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class CreateMandateError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private CreateMandateError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static CreateMandateError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static CreateMandateError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<CreateMandateError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            400 or 422 or 429 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<CreateMandateError> Response { get; } = new(Create);
}
