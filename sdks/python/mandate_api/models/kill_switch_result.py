from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.status import StatusOrStr


class KillSwitchResult(SdkBaseModel):
    ok: Optional[bool] = UNSET
    action: Optional[str] = UNSET
    status: Optional[StatusOrStr] = UNSET
    changed: Optional[list[str]] = UNSET
    """IDs of the mandates that changed"""


class KillSwitchResultDict(TypedDict):
    ok: NotRequired[bool]
    action: NotRequired[str]
    status: NotRequired[StatusOrStr]
    changed: NotRequired[list[str]]
