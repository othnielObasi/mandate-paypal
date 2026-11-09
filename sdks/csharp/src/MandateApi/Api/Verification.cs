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
using MandateApi.Requests.Verification;

namespace MandateApi.Api;

/// <summary>
/// Check an agent payment before you ship, or for a dispute. Public keys only, no trust in Mandate needed.
/// </summary>
public sealed class Verification
{
    private readonly RawClient _rawClient;
    private readonly Server _server;

    internal Verification(RawClient rawClient, Server server)
    {
        _rawClient = rawClient;
        _server = server;
    }

    /// <summary>
    /// AP2 v0.2 evidence pack for a PayPal order
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Ap2Verdict"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="GetAp2EvidenceError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256),
    /// the checkout and payment receipts, budget context, the passkey assertion if the buyer approved
    /// on their device, and every check with its result. Verify independently with <c>/api/ap2/jwks</c>.
    /// </remarks>
    public Task<Ap2Verdict> GetAp2Evidence(GetAp2EvidenceRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/ap2/orders/{paypalOrderId}"),
            [new TemplateParam("paypalOrderId", request.PaypalOrderId)],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<Ap2Verdict>(),
            GetAp2EvidenceError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// A merchant's agent payments with their verdicts
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="IReadOnlyList{T}"/> of <see cref="SellerPayment"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2
    /// result. A seller's queue of "safe to fulfil" and "don't ship" orders.
    /// </remarks>
    public Task<IReadOnlyList<SellerPayment>> ListSellerPayments(ListSellerPaymentsRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/seller"),
            [],
            [new Param("merchantId", request.MerchantId)],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<IReadOnlyList<SellerPayment>>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Verify a Mandate v1 credential chain you hold
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="ChainVerdict"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="VerifyChainError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Checks an Intent, Cart and Payment Mandate chain against the published keys.
    /// </remarks>
    public Task<ChainVerdict> VerifyChain(VerifyChainOperationRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/verify"),
            [],
            [],
            [new HeaderParam("Idempotency-Key", Guid.NewGuid())],
            HttpMethod.Post,
            JsonRequest.Create(request.Body),
            JsonResponse.Create<ChainVerdict>(),
            VerifyChainError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Verdict for an agent payment
    /// </summary>
    /// <param name="request">The operation's inputs</param>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="OrderVerdict"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="VerifyOrderError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks
    /// (Intent, Cart and Payment Mandates, Ed25519), the <c>paypal_order_record</c> check (PayPal's own
    /// order record, read with the PayPal Server SDK, shows the signed amount captured), and the
    /// AP2 v0.2 verdict in <c>ap2</c>.
    /// Fulfil only when <c>ok</c> and <c>ap2.ok</c> are both true.
    /// </remarks>
    public Task<OrderVerdict> VerifyOrder(VerifyOrderRequest request,
        RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/verify/{paypalOrderId}"),
            [new TemplateParam("paypalOrderId", request.PaypalOrderId)],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<OrderVerdict>(),
            VerifyOrderError.Response,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
