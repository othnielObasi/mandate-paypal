from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .automation_status import AutomationStatus, AutomationStatusDict
from .enums.model_provider import ModelProviderOrStr
from .enums.signing_key import SigningKeyOrStr
from .enums.storage import StorageOrStr
from .enums.web import WebOrStr


class Health(SdkBaseModel):
    ok: Optional[bool] = UNSET
    provider: Optional[str] = UNSET
    """``paypal-agent-toolkit`` with sandbox keys, else ``simulated``"""

    model: Optional[str] = UNSET
    """Model ID (muse-spark-1.3, claude-sonnet-5-5…), or ``offline-planner``"""

    model_provider: Optional[ModelProviderOrStr] = Field(default=UNSET, alias="modelProvider")
    signing_key: Optional[SigningKeyOrStr] = Field(default=UNSET, alias="signingKey")
    storage: Optional[StorageOrStr] = UNSET
    market: Optional[str] = UNSET
    web: Optional[WebOrStr] = UNSET
    """KERNEL cloud browser, or only the app's own /demo pages"""

    automation: Optional[AutomationStatus] = UNSET
    sandbox_only: Optional[bool] = Field(default=UNSET, alias="sandboxOnly")
    """Always true. Mandate never moves real money."""


class HealthDict(TypedDict):
    ok: NotRequired[bool]
    provider: NotRequired[str]
    model: NotRequired[str]
    model_provider: NotRequired[ModelProviderOrStr]
    signing_key: NotRequired[SigningKeyOrStr]
    storage: NotRequired[StorageOrStr]
    market: NotRequired[str]
    web: NotRequired[WebOrStr]
    automation: NotRequired[AutomationStatusDict]
    sandbox_only: NotRequired[bool]
