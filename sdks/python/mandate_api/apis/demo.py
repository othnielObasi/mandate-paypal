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
from ..errors.create_mandate_error import CreateMandateErrorBody, create_mandate_error_mapper
from ..errors.decide_approval_error import DecideApprovalErrorBody, decide_approval_error_mapper
from ..errors.run_agent_error import RunAgentErrorBody, run_agent_error_mapper
from ..models.agent_run import AgentRun
from ..models.approval import Approval
from ..models.create_mandate_request import CreateMandateRequest, CreateMandateRequestDict
from ..models.decide_approval_request import DecideApprovalRequest, DecideApprovalRequestDict
from ..models.health import Health
from ..models.mandate import Mandate
from ..models.propose_result import ProposeResult
from ..models.run_agent_request import RunAgentRequest, RunAgentRequestDict
from ..server.server import Server


class Demo:
    def __init__(self, client: RawClient, server: Server) -> None:
        self._with_raw_response = DemoWithRawResponse(client, server)

    def create_mandate(
        self,
        body: CreateMandateRequest | CreateMandateRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> Mandate:
        """With only ``text``, the rules reader (the configured model, or the offline reader) turns the sentence into a
        policy and Mandate signs it. With ``policy``, the rules the user reviewed are validated and signed. Rate limited
        when the model is called.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The signed mandate

        Raises:
            ApiError: Malformed request The rules could not be read or are invalid Too many requests to routes that call
                the model ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.create_mandate(body, request_options=request_options))

    def decide_approval(
        self,
        id_: str,
        body: DecideApprovalRequest | DecideApprovalRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProposeResult:
        """If the user has a passkey, approving needs a WebAuthn assertion over this exact cart (challenge from ``GET
        /api/approvals/{id}/passkey``). Hard rules (category, seller, injected instructions) can never be approved
        through.

        Args:
            id_: The approval ID from ``listApprovals`` or the agent run.
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Outcome

        Raises:
            ApiError: Passkey missing or invalid Not found Already decided Expired ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.decide_approval(id_, body, request_options=request_options))

    def get_health(self, *, request_options: RequestOptionsOrDict | None = None) -> Health:
        """Which integrations this server is running with: real PayPal sandbox or simulated payments, the model behind
        the agent, where data is stored, and whether Zapier alerts and the kill switch are on. Always sandbox-only.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Status

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.get_health(request_options=request_options))

    def list_approvals(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[Approval]:
        """Purchases the gate sent to the user (over a soft limit), with when each request expires.

        Args:
            mandate_id: Only this mandate's approvals. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Pending approvals

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.list_approvals(mandate_id=mandate_id, request_options=request_options))

    def list_mandates(self, *, request_options: RequestOptionsOrDict | None = None) -> list[Mandate]:
        """Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Mandates

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(self._with_raw_response.list_mandates(request_options=request_options))

    def run_agent(
        self, body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> AgentRun:
        """The agent can only search, read and propose. Each proposal goes through the policy gate, which pays, asks the
        user, or blocks. With ``stream: true`` the response is NDJSON, one step per line.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The run, with every step and the gate's decisions

        Raises:
            ApiError: Not found Too many requests to routes that call the model ``error`` is ``Error | RawError``."""
        return unwrap(self._with_raw_response.run_agent(body, request_options=request_options))

    @property
    def with_raw_response(self) -> DemoWithRawResponse:
        return self._with_raw_response


class AsyncDemo:
    def __init__(self, client: AsyncRawClient, server: Server) -> None:
        self._with_raw_response = AsyncDemoWithRawResponse(client, server)

    async def create_mandate(
        self,
        body: CreateMandateRequest | CreateMandateRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> Mandate:
        """With only ``text``, the rules reader (the configured model, or the offline reader) turns the sentence into a
        policy and Mandate signs it. With ``policy``, the rules the user reviewed are validated and signed. Rate limited
        when the model is called.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The signed mandate

        Raises:
            ApiError: Malformed request The rules could not be read or are invalid Too many requests to routes that call
                the model ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.create_mandate(body, request_options=request_options))

    async def decide_approval(
        self,
        id_: str,
        body: DecideApprovalRequest | DecideApprovalRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ProposeResult:
        """If the user has a passkey, approving needs a WebAuthn assertion over this exact cart (challenge from ``GET
        /api/approvals/{id}/passkey``). Hard rules (category, seller, injected instructions) can never be approved
        through.

        Args:
            id_: The approval ID from ``listApprovals`` or the agent run.
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Outcome

        Raises:
            ApiError: Passkey missing or invalid Not found Already decided Expired ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.decide_approval(id_, body, request_options=request_options))

    async def get_health(self, *, request_options: RequestOptionsOrDict | None = None) -> Health:
        """Which integrations this server is running with: real PayPal sandbox or simulated payments, the model behind
        the agent, where data is stored, and whether Zapier alerts and the kill switch are on. Always sandbox-only.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Status

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.get_health(request_options=request_options))

    async def list_approvals(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> list[Approval]:
        """Purchases the gate sent to the user (over a soft limit), with when each request expires.

        Args:
            mandate_id: Only this mandate's approvals. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Pending approvals

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(
            await self._with_raw_response.list_approvals(mandate_id=mandate_id, request_options=request_options)
        )

    async def list_mandates(self, *, request_options: RequestOptionsOrDict | None = None) -> list[Mandate]:
        """Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            Mandates

        Raises:
            ApiError: If the API responds with an error status code. ``error`` is ``RawError``."""
        return unwrap(await self._with_raw_response.list_mandates(request_options=request_options))

    async def run_agent(
        self, body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> AgentRun:
        """The agent can only search, read and propose. Each proposal goes through the policy gate, which pays, asks the
        user, or blocks. With ``stream: true`` the response is NDJSON, one step per line.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            The run, with every step and the gate's decisions

        Raises:
            ApiError: Not found Too many requests to routes that call the model ``error`` is ``Error | RawError``."""
        return unwrap(await self._with_raw_response.run_agent(body, request_options=request_options))

    @property
    def with_raw_response(self) -> AsyncDemoWithRawResponse:
        return self._with_raw_response


class DemoWithRawResponse(BaseRawResponse[RawClient, Server]):
    def create_mandate(
        self,
        body: CreateMandateRequest | CreateMandateRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[Mandate, CreateMandateErrorBody]:
        """With only ``text``, the rules reader (the configured model, or the offline reader) turns the sentence into a
        policy and Mandate signs it. With ``policy``, the rules the user reviewed are validated and signed. Rate limited
        when the model is called.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/mandates"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[CreateMandateRequest | CreateMandateRequestDict](body),
            decoder=json_decoder[Mandate],
            error_mapper=create_mandate_error_mapper,
            request_options=request_options,
        )

    def decide_approval(
        self,
        id_: str,
        body: DecideApprovalRequest | DecideApprovalRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProposeResult, DecideApprovalErrorBody]:
        """If the user has a passkey, approving needs a WebAuthn assertion over this exact cart (challenge from ``GET
        /api/approvals/{id}/passkey``). Hard rules (category, seller, injected instructions) can never be approved
        through.

        Args:
            id_: The approval ID from ``listApprovals`` or the agent run.
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/approvals/{id}"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[DecideApprovalRequest | DecideApprovalRequestDict](body),
            decoder=json_decoder[ProposeResult],
            error_mapper=decide_approval_error_mapper,
            request_options=request_options,
        )

    def get_health(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Health, RawError]:
        """Which integrations this server is running with: real PayPal sandbox or simulated payments, the model behind
        the agent, where data is stored, and whether Zapier alerts and the kill switch are on. Always sandbox-only.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/health"),
            decoder=json_decoder[Health],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def list_approvals(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Approval], RawError]:
        """Purchases the gate sent to the user (over a soft limit), with when each request expires.

        Args:
            mandate_id: Only this mandate's approvals. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/approvals"),
            query_params=[param[str | None]("mandateId", mandate_id)],
            decoder=json_decoder[list[Approval]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def list_mandates(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Mandate], RawError]:
        """Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/mandates"),
            decoder=json_decoder[list[Mandate]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    def run_agent(
        self, body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AgentRun, RunAgentErrorBody]:
        """The agent can only search, read and propose. Each proposal goes through the policy gate, which pays, asks the
        user, or blocks. With ``stream: true`` the response is NDJSON, one step per line.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/agent/run"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunAgentRequest | RunAgentRequestDict](body),
            decoder=json_decoder[AgentRun],
            error_mapper=run_agent_error_mapper,
            request_options=request_options,
        )


class AsyncDemoWithRawResponse(BaseRawResponse[AsyncRawClient, Server]):
    async def create_mandate(
        self,
        body: CreateMandateRequest | CreateMandateRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[Mandate, CreateMandateErrorBody]:
        """With only ``text``, the rules reader (the configured model, or the offline reader) turns the sentence into a
        policy and Mandate signs it. With ``policy``, the rules the user reviewed are validated and signed. Rate limited
        when the model is called.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/mandates"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[CreateMandateRequest | CreateMandateRequestDict](body),
            decoder=async_json_decoder[Mandate],
            error_mapper=create_mandate_error_mapper,
            request_options=request_options,
        )

    async def decide_approval(
        self,
        id_: str,
        body: DecideApprovalRequest | DecideApprovalRequestDict,
        *,
        request_options: RequestOptionsOrDict | None = None,
    ) -> ApiResult[ProposeResult, DecideApprovalErrorBody]:
        """If the user has a passkey, approving needs a WebAuthn assertion over this exact cart (challenge from ``GET
        /api/approvals/{id}/passkey``). Hard rules (category, seller, injected instructions) can never be approved
        through.

        Args:
            id_: The approval ID from ``listApprovals`` or the agent run.
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/approvals/{id}"),
            path_params=[param[str]("id", id_)],
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[DecideApprovalRequest | DecideApprovalRequestDict](body),
            decoder=async_json_decoder[ProposeResult],
            error_mapper=decide_approval_error_mapper,
            request_options=request_options,
        )

    async def get_health(self, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Health, RawError]:
        """Which integrations this server is running with: real PayPal sandbox or simulated payments, the model behind
        the agent, where data is stored, and whether Zapier alerts and the kill switch are on. Always sandbox-only.

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/health"),
            decoder=async_json_decoder[Health],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def list_approvals(
        self, *, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Approval], RawError]:
        """Purchases the gate sent to the user (over a soft limit), with when each request expires.

        Args:
            mandate_id: Only this mandate's approvals. Omit for all.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/approvals"),
            query_params=[param[str | None]("mandateId", mandate_id)],
            decoder=async_json_decoder[list[Approval]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def list_mandates(
        self, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[list[Mandate], RawError]:
        """Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

        Args:
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="GET",
            url_template=self._server.default("/api/mandates"),
            decoder=async_json_decoder[list[Mandate]],
            error_mapper=raw_error_response,
            request_options=request_options,
        )

    async def run_agent(
        self, body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None
    ) -> ApiResult[AgentRun, RunAgentErrorBody]:
        """The agent can only search, read and propose. Each proposal goes through the policy gate, which pays, asks the
        user, or blocks. With ``stream: true`` the response is NDJSON, one step per line.

        Args:
            body: The request body.
            request_options: Per-call overrides for this one request, such as a timeout, extra headers, or its retry
                count and statuses.

        Returns:
            An ``ApiResult`` holding the deserialized response or the error body."""
        return await self._client.execute(
            http_method="POST",
            url_template=self._server.default("/api/agent/run"),
            headers=[param[UUID]("Idempotency-Key", uuid4())],
            body=json_body[RunAgentRequest | RunAgentRequestDict](body),
            decoder=async_json_decoder[AgentRun],
            error_mapper=run_agent_error_mapper,
            request_options=request_options,
        )
