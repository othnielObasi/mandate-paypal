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
using MandateApi.Models.AnyOf;
using MandateApi.Requests.Receipts;

namespace MandateApi.Api;

/// <summary>
/// Mandate's signed, hash-chained decision log.
/// </summary>
public sealed class Receipts
{
    private readonly RawClient _rawClient;
    private readonly Server _server;

    internal Receipts(RawClient rawClient, Server server)
    {
        _rawClient = rawClient;
        _server = server;
    }

    /// <summary>
    /// The signed, hash-chained decision log
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="Receipt"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an
    /// Ed25519 signature, so any edit, insertion or deletion breaks the chain.
    /// </remarks>
    public Task<IReadOnlyList<Receipt>> ListReceipts(ListReceiptsRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/receipts"),
            [],
            [new Param("mandateId", request.MandateId)],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<Receipt>>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Verify a copy of the log you hold
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ChainResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="VerifyLogCopyError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Names the first altered entry (<c>brokenAt</c>) and why.
    /// </remarks>
    public Task<ChainResult> VerifyLogCopy(VerifyLogCopyRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/receipts/verify"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ChainResult>(),
            VerifyLogCopyError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Verify the server's own log
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ChainResult"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Re-checks every hash link and signature in the server's decision log.
    /// </remarks>
    public Task<ChainResult> VerifyServerLog(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/receipts/verify"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<ChainResult>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
