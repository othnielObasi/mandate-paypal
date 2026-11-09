from __future__ import annotations

from uuid import UUID, uuid4

from ..auth import AsyncAuthSchemes, AuthSchemes
from ..core import (
    ApiResult,
    AsyncRawClient,
    RawClient,
    RequestOptionsOrDict,
    SecuredRawResponse,
    async_json_decoder,
    json_body,
    json_decoder,
    param,
    unwrap,
)
from ..errors.kill_switch_error import KillSwitchErrorBody, kill_switch_error_mapper
from ..models.kill_switch_request import KillSwitchRequest, KillSwitchRequestDict
from ..models.kill_switch_result import KillSwitchResult
from ..server.server import Server


class Automation:
    def __init__(self, client: RawClient, server: Server, auth: AuthSchemes) -> None:
        self._with_raw_response = AutomationWithRawResponse(client, server, auth)

    def kill_switch(
        self, body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> KillSwitchResult:
        """For a Zap such as "text STOP to pause every agent". Without ``mandateId`` it acts on all of the user's
        mandates. Logged in the signed decision log as "via automation".

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The mandates that changed

        Raises:
            ApiError: Malformed request Missing or wrong bearer token Not found Not configured (no AUTOMATION_SECRET)
                ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.kill_switch(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AutomationWithRawResponse:
        return self._with_raw_response


class AsyncAutomation:
    def __init__(self, client: AsyncRawClient, server: Server, auth: AsyncAuthSchemes) -> None:
        self._with_raw_response = AsyncAutomationWithRawResponse(client, server, auth)

    async def kill_switch(
        self, body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> KillSwitchResult:
        """For a Zap such as "text STOP to pause every agent". Without ``mandateId`` it acts on all of the user's
        mandates. Logged in the signed decision log as "via automation".

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The mandates that changed

        Raises:
            ApiError: Malformed request Missing or wrong bearer token Not found Not configured (no AUTOMATION_SECRET)
                ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.kill_switch(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncAutomationWithRawResponse:
        return self._with_raw_response


class AutomationWithRawResponse(SecuredRawResponse[RawClient, Server, AuthSchemes]):
    def kill_switch(
        self, body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[KillSwitchResult, KillSwitchErrorBody]:
        """For a Zap such as "text STOP to pause every agent". Without ``mandateId`` it acts on all of the user's
        mandates. Logged in the signed decision log as "via automation".

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/automation/kill-switch"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[KillSwitchRequest | KillSwitchRequestDict](body),
            auth_scheme=self._auth.automation_secret,
            decoder=json_decoder[KillSwitchResult],
            error_mapper=kill_switch_error_mapper,
            request_options=request_options,
        )


class AsyncAutomationWithRawResponse(SecuredRawResponse[AsyncRawClient, Server, AsyncAuthSchemes]):
    async def kill_switch(
        self, body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[KillSwitchResult, KillSwitchErrorBody]:
        """For a Zap such as "text STOP to pause every agent". Without ``mandateId`` it acts on all of the user's
        mandates. Logged in the signed decision log as "via automation".

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/automation/kill-switch"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[KillSwitchRequest | KillSwitchRequestDict](body),
            auth_scheme=self._auth.automation_secret,
            decoder=async_json_decoder[KillSwitchResult],
            error_mapper=kill_switch_error_mapper,
            request_options=request_options,
        )
