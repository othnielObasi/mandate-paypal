from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class Money(SdkBaseModel):
    amount: Optional[int] = UNSET
    """Minor units (cents)"""

    currency: Optional[str] = UNSET


class MoneyDict(TypedDict):
    amount: NotRequired[int]
    currency: NotRequired[str]
