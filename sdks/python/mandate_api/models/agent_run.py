from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .agent_event import AgentEvent, AgentEventDict
from .enums.stopped_by import StoppedByOrStr


class AgentRun(SdkBaseModel):
    final: Optional[str] = UNSET
    stopped_by: Optional[StoppedByOrStr] = Field(default=UNSET, alias="stoppedBy")
    events: Optional[list[AgentEvent]] = UNSET


class AgentRunDict(TypedDict):
    final: NotRequired[str]
    stopped_by: NotRequired[StoppedByOrStr]
    events: NotRequired[list[AgentEventDict]]
