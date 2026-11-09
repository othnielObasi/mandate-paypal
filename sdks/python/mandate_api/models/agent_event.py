from __future__ import annotations

from typing import Any

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.kind import KindOrStr


class AgentEvent(SdkBaseModel):
    kind: Optional[KindOrStr] = UNSET
    text: Optional[str] = UNSET
    name: Optional[str] = UNSET
    input: Optional[Any] = UNSET
    ok: Optional[bool] = UNSET
    result: Optional[Any] = UNSET
    """For propose_purchase, a ProposeResult"""


class AgentEventDict(TypedDict):
    kind: NotRequired[KindOrStr]
    text: NotRequired[str]
    name: NotRequired[str]
    input: NotRequired[Any]
    ok: NotRequired[bool]
    result: NotRequired[Any]
