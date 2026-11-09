using System.Threading;
using System.Threading.Tasks;
using MandateApi.Core.Models;

namespace MandateApi.Core.ErrorResponse;

internal interface IErrorResponse<TError>
{
    Task<TError> Map(ResponseContext context, CancellationToken cancellationToken);
}
