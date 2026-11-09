using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class GetAp2EvidenceError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private GetAp2EvidenceError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static GetAp2EvidenceError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static GetAp2EvidenceError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<GetAp2EvidenceError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            404 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<GetAp2EvidenceError> Response { get; } = new(Create);
}
