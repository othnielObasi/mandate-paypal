from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class RunAgentRequest(SdkBaseModel):
    mandate_id: str = Field(alias="mandateId")
    task: str
    drill: Optional[bool] = UNSET
    """Compromised-agent drill: a planner that obeys product pages."""

    stream: Optional[bool] = UNSET
    """Stream NDJSON"""


class RunAgentRequestDict(TypedDict):
    mandate_id: str
    task: str
    drill: NotRequired[bool]
    stream: NotRequired[bool]
