from __future__ import annotations

from ..core import (
    ApiResult,
    AsyncRawClient,
    BaseRawResponse,
    RawClient,
    RawError,
    RequestOptionsOrDict,
    async_empty_response,
    async_json_decoder,
    empty_response,
    json_decoder,
    raw_error_response,
    unwrap,
)
from ..models.jwks import Jwks
from ..models.trust import Trust
from ..server.server import Server


class Keys:
    def __init__(self, client: RawClient, server: Server) -> None:
        self._with_raw_response = KeysWithRawResponse(client, server)

    def get_ap2_jwks(self, *, request_options: RequestOptionsOrDict | None = None) -> Jwks:
        """Provider, agent, payment gateway, merchants and users. Look keys up by ``kid``.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            JWKS

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.get_ap2_jwks(request_options=request_options))

    def get_receipt_public_key(self, *, request_options: RequestOptionsOrDict | None = None) -> None:
        """The PEM public key for checking the ``signature`` on every receipt in the decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            PEM public key

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.get_receipt_public_key(request_options=request_options))

    def get_trust(self, *, request_options: RequestOptionsOrDict | None = None) -> Trust:
        """The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's verified status),
        the platform key, and the AP2 JWKS. Cache it to verify payments offline.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Keys

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.get_trust(request_options=request_options))

    @property
    def with_raw_response(self) -> KeysWithRawResponse:
        return self._with_raw_response


class AsyncKeys:
    def __init__(self, client: AsyncRawClient, server: Server) -> None:
        self._with_raw_response = AsyncKeysWithRawResponse(client, server)

    async def get_ap2_jwks(self, *, request_options: RequestOptionsOrDict | None = None) -> Jwks:
        """Provider, agent, payment gateway, merchants and users. Look keys up by ``kid``.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            JWKS

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.get_ap2_jwks(request_options=request_options))

    async def get_receipt_public_key(self, *, request_options: RequestOptionsOrDict | None = None) -> None:
        """The PEM public key for checking the ``signature`` on every receipt in the decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            PEM public key

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.get_receipt_public_key(request_options=request_options))

    async def get_trust(self, *, request_options: RequestOptionsOrDict | None = None) -> Trust:
        """The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's verified status),
        the platform key, and the AP2 JWKS. Cache it to verify payments offline.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Keys

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.get_trust(request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncKeysWithRawResponse:
        return self._with_raw_response


class KeysWithRawResponse(BaseRawResponse[RawClient, Server]):
    def get_ap2_jwks(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Jwks, RawError]:
        """Provider, agent, payment gateway, merchants and users. Look keys up by ``kid``.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/ap2/jwks"),
            decoder=json_decoder[Jwks],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def get_receipt_public_key(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, RawError]:
        """The PEM public key for checking the ``signature`` on every receipt in the decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/public-key"),
            decoder=empty_response,
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def get_trust(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Trust, RawError]:
        """The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's verified status),
        the platform key, and the AP2 JWKS. Cache it to verify payments offline.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/trust"),
            decoder=json_decoder[Trust],
            error_mapper=raw_error_response,
            request_options=request_options,
        )


class AsyncKeysWithRawResponse(BaseRawResponse[AsyncRawClient, Server]):
    async def get_ap2_jwks(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Jwks, RawError]:
        """Provider, agent, payment gateway, merchants and users. Look keys up by ``kid``.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/ap2/jwks"),
            decoder=async_json_decoder[Jwks],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def get_receipt_public_key(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[None, RawError]:
        """The PEM public key for checking the ``signature`` on every receipt in the decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/public-key"),
            decoder=async_empty_response,
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def get_trust(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Trust, RawError]:
        """The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's verified status),
        the platform key, and the AP2 JWKS. Cache it to verify payments offline.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/trust"),
            decoder=async_json_decoder[Trust],
            error_mapper=raw_error_response,
            request_options=request_options,
        )
