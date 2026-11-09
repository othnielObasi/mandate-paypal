from __future__ import annotations

from functools import cached_property
from types import TracebackType

from typing_extensions import Self

from .apis.automation import Automation
from .apis.demo import Demo
from .apis.keys import Keys
from .apis.receipts import Receipts
from .apis.verification import Verification
from .auth import AuthSchemes
from .base_client import DEFAULT_TIMEOUT, BaseMandateApiClient
from .core import (
    OPERATING_SYSTEM,
    PYTHON_RUNTIME,
    BearerAuthScheme,
    HttpClient,
    Httpx2Client,
    LoggingOptionsOrDict,
    RawClient,
    RetryOptionsOrDict,
    no_auth,
    param,
)
from .server.environment import Environment


class MandateApiClient(BaseMandateApiClient[RawClient]):
    def __init__(
        self,
        *,
        environment: Environment = "production",
        base_url: str | None = None,
        timeout: float = DEFAULT_TIMEOUT,
        retry_options: int | RetryOptionsOrDict | None = None,
        logging_options: LoggingOptionsOrDict | None = None,
        custom_http_client: HttpClient | None = None,
        automation_secret: str | None = None,
    ) -> None:
        super().__init__(
            environment=environment,
            base_url=base_url,
            timeout=timeout,
            retry_options=retry_options,
            logging_options=logging_options,
        )
        self._raw_client = RawClient(
            http_client=custom_http_client if custom_http_client is not None else Httpx2Client(timeout=timeout),
            retry_options=self._retry_options,
            logging_options=self._logging_options,
            global_headers=[
                param[str]("User-Agent", "MandateApiClient/0.2.0 Python"),
                param[str]("X-APIMatic-Lang", "Python"),
                param[str]("X-APIMatic-Package-Version", "0.2.0"),
                param[str]("X-APIMatic-Gen-Version", "4.0.0"),
                param[str]("X-APIMatic-OS", OPERATING_SYSTEM),
                param[str]("X-APIMatic-Runtime", PYTHON_RUNTIME),
            ],
        )
        self._auth = AuthSchemes(
            automation_secret=BearerAuthScheme(automation_secret) if automation_secret is not None else no_auth
        )

    @cached_property
    def automation(self) -> Automation:
        return Automation(self._raw_client, self._server, self._auth)

    @cached_property
    def demo(self) -> Demo:
        return Demo(self._raw_client, self._server)

    @cached_property
    def keys(self) -> Keys:
        return Keys(self._raw_client, self._server)

    @cached_property
    def receipts(self) -> Receipts:
        return Receipts(self._raw_client, self._server)

    @cached_property
    def verification(self) -> Verification:
        return Verification(self._raw_client, self._server)

    def close(self) -> None:
        self._raw_client.http_client.close()

    def __enter__(self) -> Self:
        return self

    def __exit__(
        self, exc_type: type[BaseException] | None, exc: BaseException | None, exc_tb: TracebackType | None
    ) -> None:
        self.close()


Client = MandateApiClient
