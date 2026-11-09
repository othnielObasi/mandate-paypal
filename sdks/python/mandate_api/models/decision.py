from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .enums.outcome import OutcomeOrStr


class Decision(SdkBaseModel):
    outcome: Optional[OutcomeOrStr] = UNSET
    rule: Optional[str] = UNSET
    reason: Optional[str] = UNSET


class DecisionDict(TypedDict):
    outcome: NotRequired[OutcomeOrStr]
    rule: NotRequired[str]
    reason: NotRequired[str]
