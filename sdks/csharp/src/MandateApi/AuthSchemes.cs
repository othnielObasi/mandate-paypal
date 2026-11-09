using MandateApi.Core;
using MandateApi.Core.Authentication;
using MandateApi.Core.Authentication.Bearer;

namespace MandateApi;

internal sealed class AuthSchemes
{
    public IAuthScheme AutomationSecret { get; }

    public AuthSchemes(MandateApiClientOptions options)
    {
        AutomationSecret =
            BearerAuthScheme.Create(
                "AutomationSecret",
                options.AutomationSecretProvider,
                options.AutomationSecret ?? EnvironmentVariables.Get("MANDATE_API_AUTOMATION_SECRET"));
    }
}
