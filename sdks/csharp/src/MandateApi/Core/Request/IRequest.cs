using System.Net.Http;

namespace MandateApi.Core.Request;

internal interface IRequest
{
    HttpContent Get();

    bool CanRetry { get; }
}
