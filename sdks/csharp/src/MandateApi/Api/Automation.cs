using System;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using MandateApi.Core;
using MandateApi.Core.Exceptions;
using MandateApi.Core.Models;
using MandateApi.Core.Request;
using MandateApi.Core.Response;
using MandateApi.Errors;
using MandateApi.Models;
using MandateApi.Requests.Automation;

namespace MandateApi.Api;

/// <summary>
/// Zapier. Out: with <c>ZAPIER_HOOK_URL</c> set, Mandate posts an <c>AutomationEvent</c> to that Catch Hook for
/// every approval request, blocked purchase, payment, failed payment and mandate status change.
/// In: a Zap can pull the kill switch with <c>AUTOMATION_SECRET</c>. Automations can stop spending, never approve it.
/// </summary>
public sealed class Automation
{
    private readonly RawClient _rawClient;
    private readonly Server _server;
    private readonly AuthSchemes _auth;

    internal Automation(RawClient rawClient, Server server, AuthSchemes auth)
    {
        _rawClient = rawClient;
        _server = server;
        _auth = auth;
    }

    /// <summary>
    /// Pause, resume or revoke spending from an automation
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="KillSwitchResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="KillSwitchError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// For a Zap such as "text STOP to pause every agent". Without <c>mandateId</c> it acts on all of the
    /// user's mandates. Logged in the signed decision log as "via automation".
    /// </remarks>
    public Task<KillSwitchResult> KillSwitch(KillSwitchOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/automation/kill-switch"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<KillSwitchResult>(),
            KillSwitchError.Response,
            _auth.AutomationSecret,
            requestOptions,
            cancellationToken);
}
