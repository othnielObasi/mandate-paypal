using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using MandateApi.Core;
using MandateApi.Core.Authentication;
using MandateApi.Core.ErrorResponse;
using MandateApi.Core.Exceptions;
using MandateApi.Core.Request;
using MandateApi.Core.Response;
using MandateApi.Models;

namespace MandateApi.Api;

/// <summary>
/// Public keys for everything Mandate signs.
/// </summary>
public sealed class Keys
{
    private readonly RawClient _rawClient;
    private readonly Server _server;

    internal Keys(RawClient rawClient, Server server)
    {
        _rawClient = rawClient;
        _server = server;
    }

    /// <summary>
    /// ES256 public keys (JWKS) for every AP2 credential
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Jwks"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// Provider, agent, payment gateway, merchants and users. Look keys up by <c>kid</c>.
    /// </remarks>
    public Task<Jwks> GetAp2Jwks(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/ap2/jwks"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<Jwks>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// Ed25519 public key that signs receipts and permits
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The PEM public key for checking the <c>signature</c> on every receipt in the decision log.
    /// </remarks>
    public Task GetReceiptPublicKey(RequestOptions? requestOptions = null,
        CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/public-key"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            VoidResponse.Instance,
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);

    /// <summary>
    /// All public keys, Mandate v1 (Ed25519 PEM) and AP2 v0.2 (JWKS)
    /// </summary>
    /// <param name="requestOptions">Per-request options, such as an overriding log level for this call</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>A <see cref="Task{TResult}"/> of <see cref="Trust"/> instance.</returns>
    /// <exception cref="ApiException{TError}"> of <see cref="RawError"/> when the server returns an error response.</exception>
    /// <remarks>
    /// The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's
    /// verified status), the platform key, and the AP2 JWKS. Cache it to verify payments offline.
    /// </remarks>
    public Task<Trust> GetTrust(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default) =>
        _rawClient.Execute(
            _server.Default("/api/trust"),
            [],
            [],
            [],
            HttpMethod.Get,
            EmptyBody.Instance,
            JsonResponse.Create<Trust>(),
            RawErrorResponse.Instance,
            AuthScheme.None,
            requestOptions,
            cancellationToken);
}
