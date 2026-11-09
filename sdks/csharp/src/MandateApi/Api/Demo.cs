using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using MandateApi.Core;
using MandateApi.Core.Authentication;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Exceptions;
using MandateApi.Core.Models;
using MandateApi.Core.Request;
using MandateApi.Core.Response;
using MandateApi.Errors;
using MandateApi.Models;
using MandateApi.Requests.Demo;

namespace MandateApi.Api;

/// <summary>
/// The buyer side of the demo. Single demo user, no login.
/// </summary>
public sealed class Demo
{
    private readonly RawClient _rawClient;
    private readonly Server _server;

    internal Demo(RawClient rawClient, Server server)
    {
        _rawClient = rawClient;
        _server = server;
    }

    /// <summary>
    /// Sign spending rules
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Mandate"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="CreateMandateError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// With only <c>text</c>, the rules reader (the configured model, or the offline reader) turns the
    /// sentence into a policy and Mandate signs it. With <c>policy</c>, the rules the user reviewed are
    /// validated and signed. Rate limited when the model is called.
    /// </remarks>
    public Task<Mandate> CreateMandate(CreateMandateOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/mandates"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<Mandate>(),
            CreateMandateError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Approve or decline a purchase
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ProposeResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="DecideApprovalError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// If the user has a passkey, approving needs a WebAuthn assertion over this exact cart
    /// (challenge from <c>GET /api/approvals/{id}/passkey</c>). Hard rules (category, seller, injected
    /// instructions) can never be approved through.
    /// </remarks>
    public Task<ProposeResult> DecideApproval(DecideApprovalOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/approvals/{id}"),
            [new TemplateParam("id", request.Id)],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ProposeResult>(),
            DecideApprovalError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Server status and which services are live or simulated
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Health"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Which integrations this server is running with: real PayPal sandbox or simulated payments, the
    /// model behind the agent, where data is stored, and whether Zapier alerts and the kill switch are on.
    /// Always sandbox-only.
    /// </remarks>
    public Task<Health> GetHealth(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/health"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<Health>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Purchases waiting for the user
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="Approval"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Purchases the gate sent to the user (over a soft limit), with when each request expires.
    /// </remarks>
    public Task<IReadOnlyList<Approval>> ListApprovals(ListApprovalsRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/approvals"),
            [],
            [new Param("mandateId", request.MandateId)],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<Approval>>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// The demo user's mandates
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="Mandate"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Every mandate the demo user has signed, with its rules and status (active, paused or revoked).
    /// </remarks>
    public Task<IReadOnlyList<Mandate>> ListMandates(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/mandates"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<Mandate>>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Let the shopping agent carry out a task under a mandate
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="AgentRun"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RunAgentError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The agent can only search, read and propose. Each proposal goes through the policy gate, which
    /// pays, asks the user, or blocks. With <c>stream: true</c> the response is NDJSON, one step per line.
    /// </remarks>
    public Task<AgentRun> RunAgent(RunAgentOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/agent/run"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<AgentRun>(),
            RunAgentError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
