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
from ..errors.get_ap2_evidence_error import GetAp2EvidenceErrorBody, get_ap2_evidence_error_mapper
from ..errors.verify_chain_error import VerifyChainErrorBody, verify_chain_error_mapper
from ..errors.verify_order_error import VerifyOrderErrorBody, verify_order_error_mapper
from ..models.ap2_verdict import Ap2Verdict
from ..models.chain_verdict import ChainVerdict
from ..models.order_verdict import OrderVerdict
from ..models.seller_payment import SellerPayment
from ..models.verify_chain_request import VerifyChainRequest, VerifyChainRequestDict
from ..server.server import Server


class Verification:
    def __init__(self, client: RawClient, server: Server) -> None:
        self._with_raw_response = VerificationWithRawResponse(client, server)

    def get_ap2_evidence(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> Ap2Verdict:
        """The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256), the checkout and
        payment receipts, budget context, the passkey assertion if the buyer approved on their device, and every check
        with its result. Verify independently with ``/api/ap2/jwks``.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Evidence pack and verdict

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.get_ap2_evidence(paypal_order_id, request_options=request_options))

    def list_seller_payments(
        self, *, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[SellerPayment]:
        """Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2 result. A
        seller's queue of "safe to fulfil" and "don't ship" orders.

        Args:
            merchant_id: Only this merchant's payments. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Payments, newest first

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(
            self._with_raw_response.list_seller_payments(merchant_id=merchant_id, request_options=request_options)
        )

    def verify_chain(
        self, body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ChainVerdict:
        """Checks an Intent, Cart and Payment Mandate chain against the published keys.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verdict

        Raises:
            ApiError: Malformed request ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.verify_chain(body, request_options=request_options))

    def verify_order(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> OrderVerdict:
        """Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks (Intent, Cart and
        Payment Mandates, Ed25519), the ``paypal_order_record`` check (PayPal's own order record, read with the PayPal
        Server SDK, shows the signed amount captured), and the AP2 v0.2 verdict in ``ap2``. Fulfil only when ``ok`` and
        ``ap2.ok`` are both true.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verdict. Check ``ok``; a 200 does not mean the payment is valid.

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.verify_order(paypal_order_id, request_options=request_options))

    @property
    def with_raw_response(self) -> VerificationWithRawResponse:
        return self._with_raw_response


class AsyncVerification:
    def __init__(self, client: AsyncRawClient, server: Server) -> None:
        self._with_raw_response = AsyncVerificationWithRawResponse(client, server)

    async def get_ap2_evidence(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> Ap2Verdict:
        """The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256), the checkout and
        payment receipts, budget context, the passkey assertion if the buyer approved on their device, and every check
        with its result. Verify independently with ``/api/ap2/jwks``.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Evidence pack and verdict

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.get_ap2_evidence(paypal_order_id, request_options=request_options))

    async def list_seller_payments(
        self, *, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[SellerPayment]:
        """Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2 result. A
        seller's queue of "safe to fulfil" and "don't ship" orders.

        Args:
            merchant_id: Only this merchant's payments. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Payments, newest first

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(
            await self._with_raw_response.list_seller_payments(merchant_id=merchant_id, request_options=request_options)
        )

    async def verify_chain(
        self, body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ChainVerdict:
        """Checks an Intent, Cart and Payment Mandate chain against the published keys.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verdict

        Raises:
            ApiError: Malformed request ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.verify_chain(body, request_options=request_options))

    async def verify_order(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> OrderVerdict:
        """Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks (Intent, Cart and
        Payment Mandates, Ed25519), the ``paypal_order_record`` check (PayPal's own order record, read with the PayPal
        Server SDK, shows the signed amount captured), and the AP2 v0.2 verdict in ``ap2``. Fulfil only when ``ok`` and
        ``ap2.ok`` are both true.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Verdict. Check ``ok``; a 200 does not mean the payment is valid.

        Raises:
            ApiError: Not found ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.verify_order(paypal_order_id, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncVerificationWithRawResponse:
        return self._with_raw_response


class VerificationWithRawResponse(BaseRawResponse[RawClient, Server]):
    def get_ap2_evidence(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[Ap2Verdict, GetAp2EvidenceErrorBody]:
        """The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256), the checkout and
        payment receipts, budget context, the passkey assertion if the buyer approved on their device, and every check
        with its result. Verify independently with ``/api/ap2/jwks``.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/ap2/orders/{paypalOrderId}"),
            path_params=[param[str]("paypalOrderId", paypal_order_id)],
            decoder=json_decoder[Ap2Verdict],
            error_mapper=get_ap2_evidence_error_mapper,
            request_options=request_options,
        )

    def list_seller_payments(
        self, *, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[SellerPayment], RawError]:
        """Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2 result. A
        seller's queue of "safe to fulfil" and "don't ship" orders.

        Args:
            merchant_id: Only this merchant's payments. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/seller"),
            query_params=[param[str | None]("merchantId", merchant_id)],
            decoder=json_decoder[list[SellerPayment]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def verify_chain(
        self, body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainVerdict, VerifyChainErrorBody]:
        """Checks an Intent, Cart and Payment Mandate chain against the published keys.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/verify"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[VerifyChainRequest | VerifyChainRequestDict](body),
            decoder=json_decoder[ChainVerdict],
            error_mapper=verify_chain_error_mapper,
            request_options=request_options,
        )

    def verify_order(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OrderVerdict, VerifyOrderErrorBody]:
        """Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks (Intent, Cart and
        Payment Mandates, Ed25519), the ``paypal_order_record`` check (PayPal's own order record, read with the PayPal
        Server SDK, shows the signed amount captured), and the AP2 v0.2 verdict in ``ap2``. Fulfil only when ``ok`` and
        ``ap2.ok`` are both true.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/verify/{paypalOrderId}"),
            path_params=[param[str]("paypalOrderId", paypal_order_id)],
            decoder=json_decoder[OrderVerdict],
            error_mapper=verify_order_error_mapper,
            request_options=request_options,
        )


class AsyncVerificationWithRawResponse(BaseRawResponse[AsyncRawClient, Server]):
    async def get_ap2_evidence(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[Ap2Verdict, GetAp2EvidenceErrorBody]:
        """The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256), the checkout and
        payment receipts, budget context, the passkey assertion if the buyer approved on their device, and every check
        with its result. Verify independently with ``/api/ap2/jwks``.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/ap2/orders/{paypalOrderId}"),
            path_params=[param[str]("paypalOrderId", paypal_order_id)],
            decoder=async_json_decoder[Ap2Verdict],
            error_mapper=get_ap2_evidence_error_mapper,
            request_options=request_options,
        )

    async def list_seller_payments(
        self, *, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[SellerPayment], RawError]:
        """Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2 result. A
        seller's queue of "safe to fulfil" and "don't ship" orders.

        Args:
            merchant_id: Only this merchant's payments. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/seller"),
            query_params=[param[str | None]("merchantId", merchant_id)],
            decoder=async_json_decoder[list[SellerPayment]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def verify_chain(
        self, body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[ChainVerdict, VerifyChainErrorBody]:
        """Checks an Intent, Cart and Payment Mandate chain against the published keys.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/verify"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[VerifyChainRequest | VerifyChainRequestDict](body),
            decoder=async_json_decoder[ChainVerdict],
            error_mapper=verify_chain_error_mapper,
            request_options=request_options,
        )

    async def verify_order(
        self, paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[OrderVerdict, VerifyOrderErrorBody]:
        """Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks (Intent, Cart and
        Payment Mandates, Ed25519), the ``paypal_order_record`` check (PayPal's own order record, read with the PayPal
        Server SDK, shows the signed amount captured), and the AP2 v0.2 verdict in ``ap2``. Fulfil only when ``ok`` and
        ``ap2.ok`` are both true.

        Args:
            paypal_order_id: PayPal order ID (sandbox), or ``SIM-…`` in offline mode.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/verify/{paypalOrderId}"),
            path_params=[param[str]("paypalOrderId", paypal_order_id)],
            decoder=async_json_decoder[OrderVerdict],
            error_mapper=verify_order_error_mapper,
            request_options=request_options,
        )
