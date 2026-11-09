using System.Net.Http;
using MandateApi.Api;
using MandateApi.Core;
using MandateApi.Core.Configuration;
using MandateApi.Core.Logging;
using MandateApi.Core.Models;

namespace MandateApi;

/// <summary>
/// Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
/// AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
/// mandates) and signed receipts. The <b>Verification</b> endpoints let a seller, PayPal or a dispute
/// reviewer check a payment with public keys alone. The <b>Demo</b> endpoints drive the same flow the app
/// uses: sign rules, let the agent shop, approve over-limit purchases.
/// <para>
/// Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
/// PayPal order IDs (<c>SIM-…</c>); with PayPal sandbox keys the IDs are real sandbox order IDs.
/// </para>
/// </summary>
public sealed class MandateApiClient
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    public MandateApiClient(HttpClient httpClient, MandateApiClientOptions options)
    {
        _server = new Server(options.Environment, options.Server);
        var queryParameterFactory = new QueryParameterFactory([]);
        var templateParamsFactory = new TemplateParamsFactory([]);
        var urlFactory = new UriFactory(queryParameterFactory, templateParamsFactory);
        var httpStatusPolicy = new HttpStatusPolicy([]);
        var headersFactory = new HeadersFactory([
            new HeaderParam("User-Agent", "MandateApiClient/0.2.0 CSharp"),
            new HeaderParam("X-APIMatic-Lang", "CSharp"),
            new HeaderParam("X-APIMatic-Package-Version", "0.2.0"),
            new HeaderParam("X-APIMatic-Gen-Version", "4.0.0"),
            new HeaderParam("X-APIMatic-OS", RuntimeEnvironment.Os),
            new HeaderParam("X-APIMatic-Runtime", RuntimeEnvironment.Runtime),
        ]);
        var resiliencePipelineFactory = new ResiliencePipelineFactory(options.Retry, options.TimeProvider);
        var httpLogger = new HttpLogger(
            options.Logging.WithEnvironmentDefaults("MANDATE_API_LOG"),
            "MandateApiClient",
            options.TimeProvider);
        var responseContexts = new ResponseContextFactory(options.TimeProvider, options.StreamReadTimeout);
        _rawClient =
            new RawClient(
                httpClient,
                urlFactory,
                httpStatusPolicy,
                headersFactory,
                resiliencePipelineFactory,
                httpLogger,
                options.Hooks,
                responseContexts);
        _auth = new AuthSchemes(options);
    }

    /// <summary>
    /// Zapier. Out: with <c>ZAPIER_HOOK_URL</c> set, Mandate posts an <c>AutomationEvent</c> to that Catch Hook for
    /// every approval request, blocked purchase, payment, failed payment and mandate status change.
    /// In: a Zap can pull the kill switch with <c>AUTOMATION_SECRET</c>. Automations can stop spending, never approve it.
    /// </summary>
    public Automation Automation => field ??= new Automation(_rawClient, _server, _auth);

    /// <summary>
    /// The buyer side of the demo. Single demo user, no login.
    /// </summary>
    public Demo Demo => field ??= new Demo(_rawClient, _server);

    /// <summary>
    /// Public keys for everything Mandate signs.
    /// </summary>
    public Keys Keys => field ??= new Keys(_rawClient, _server);

    /// <summary>
    /// Mandate's signed, hash-chained decision log.
    /// </summary>
    public Receipts Receipts => field ??= new Receipts(_rawClient, _server);

    /// <summary>
    /// Check an agent payment before you ship, or for a dispute. Public keys only, no trust in Mandate needed.
    /// </summary>
    public Verification Verification => field ??= new Verification(_rawClient, _server);
}
