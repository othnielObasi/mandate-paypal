using System.Net.Http;

namespace MandateApi.Core.Extensions;

internal static class HttpContentExtension
{
    extension(HttpContent)
    {
        public static HttpContent None => null!;
    }
}
