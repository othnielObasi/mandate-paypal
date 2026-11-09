from __future__ import annotations

from uuid import UUID, uuid4

from ..core import (
    ApiResult,
    AsyncRawClient,
    BaseRawResponse,
    RawClient,
    RawError,
    RequestOptionsOrDict,
    async_json_decoder,
    json_body,
    json_decoder,
    param,
    raw_error_response,
    unwrap,
)
from ..errors.verify_log_copy_error import VerifyLogCopyErrorBody, verify_log_copy_error_mapper
from ..models.receipt import Receipt
from ..models.unions.chain_result import ChainResult
from ..models.verify_log_request import VerifyLogRequest, VerifyLogRequestDict
from ..server.server import Server


class Receipts:
    def __init__(self, client: RawClient, server: Server) -> None:
        self._with_raw_response = ReceiptsWithRawResponse(client, server)

    def list_receipts(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[Receipt]:
        """Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an Ed25519
        signature, so any edit, insertion or deletion breaks the chain.

        Args:
            mandate_id: Only this mandate's receipts. Omit for the whole log.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Receipts in order

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.list_receipts(mandate_id=mandate_id, request_options=request_options))

    def verify_log_copy(
        self, body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ChainResult:
        """Names the first altered entry (``brokenAt``) and why.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Result

        Raises:
            ApiError: Malformed request ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.verify_log_copy(body, request_options=request_options))

    def verify_server_log(self, *, request_options: RequestOptionsOrDict | None = None) -> ChainResult:
        """Re-checks every hash link and signature in the server's decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Result

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.verify_server_log(request_options=request_options))

    @property
    def with_raw_response(self) -> ReceiptsWithRawResponse:
        return self._with_raw_response


class AsyncReceipts:
    def __init__(self, client: AsyncRawClient, server: Server) -> None:
        self._with_raw_response = AsyncReceiptsWithRawResponse(client, server)

    async def list_receipts(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[Receipt]:
        """Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an Ed25519
        signature, so any edit, insertion or deletion breaks the chain.

        Args:
            mandate_id: Only this mandate's receipts. Omit for the whole log.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Receipts in order

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(
            await self._with_raw_response.list_receipts(mandate_id=mandate_id, request_options=request_options)
        )

    async def verify_log_copy(
        self, body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ChainResult:
        """Names the first altered entry (``brokenAt``) and why.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Result

        Raises:
            ApiError: Malformed request ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.verify_log_copy(body, request_options=request_options))

    async def verify_server_log(self, *, request_options: RequestOptionsOrDict | None = None) -> ChainResult:
        """Re-checks every hash link and signature in the server's decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Result

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.verify_server_log(request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncReceiptsWithRawResponse:
        return self._with_raw_response


class ReceiptsWithRawResponse(BaseRawResponse[RawClient, Server]):
    def list_receipts(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Receipt], RawError]:
        """Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an Ed25519
        signature, so any edit, insertion or deletion breaks the chain.

        Args:
            mandate_id: Only this mandate's receipts. Omit for the whole log.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/receipts"),
            query_params=[param[str | None]("mandateId", mandate_id)],
            decoder=json_decoder[list[Receipt]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def verify_log_copy(
        self, body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainResult, VerifyLogCopyErrorBody]:
        """Names the first altered entry (``brokenAt``) and why.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/receipts/verify"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[VerifyLogRequest | VerifyLogRequestDict](body),
            decoder=json_decoder[ChainResult],
            error_mapper=verify_log_copy_error_mapper,
            request_options=request_options,
        )

    def verify_server_log(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainResult, RawError]:
        """Re-checks every hash link and signature in the server's decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/receipts/verify"),
            decoder=json_decoder[ChainResult],
            error_mapper=raw_error_response,
            request_options=request_options,
        )


class AsyncReceiptsWithRawResponse(BaseRawResponse[AsyncRawClient, Server]):
    async def list_receipts(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Receipt], RawError]:
        """Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an Ed25519
        signature, so any edit, insertion or deletion breaks the chain.

        Args:
            mandate_id: Only this mandate's receipts. Omit for the whole log.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/receipts"),
            query_params=[param[str | None]("mandateId", mandate_id)],
            decoder=async_json_decoder[list[Receipt]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def verify_log_copy(
        self, body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainResult, VerifyLogCopyErrorBody]:
        """Names the first altered entry (``brokenAt``) and why.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/receipts/verify"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[VerifyLogRequest | VerifyLogRequestDict](body),
            decoder=async_json_decoder[ChainResult],
            error_mapper=verify_log_copy_error_mapper,
            request_options=request_options,
        )

    async def verify_server_log(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainResult, RawError]:
        """Re-checks every hash link and signature in the server's decision log.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/receipts/verify"),
            decoder=async_json_decoder[ChainResult],
            error_mapper=raw_error_response,
            request_options=request_options,
        )
