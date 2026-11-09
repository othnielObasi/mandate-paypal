using System.Threading.Tasks;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Models;
using MandateApi.Models;

namespace MandateApi.Errors;

public sealed class DecideApprovalError : ApiError
{
    private readonly Optional<Error> _errorValue;

    private DecideApprovalError(Optional<Error> errorValue, Optional<RawError> fallback) : base(fallback)
    {
        _errorValue = errorValue;
    }

    private static DecideApprovalError AsError(Error value) => new(Optional<Error>.Some(value), default);

    private static DecideApprovalError AsFallback(RawError value) => new(default, Optional<RawError>.Some(value));

    public bool TryGetError(out Error value) => _errorValue.TryGetValue(out value);

    private static Task<DecideApprovalError> Create(FailedResponse response) =>
        response.StatusCode switch
        {
            403 or 404 or 409 or 410 => response.Json<Error>().As(AsError),
            _ => response.RawBody().As(AsFallback)
        };

    internal static ApiErrorResponse<DecideApprovalError> Response { get; } = new(Create);
}
