from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.action import ActionOrStr


class KillSwitchRequest(SdkBaseModel):
    action: ActionOrStr
    mandate_id: Optional[str] = Field(default=UNSET, alias="mandateId")
    """Only this mandate. Omit for all of the user's mandates."""


class KillSwitchRequestDict(TypedDict):
    action: ActionOrStr
    mandate_id: NotRequired[str]
