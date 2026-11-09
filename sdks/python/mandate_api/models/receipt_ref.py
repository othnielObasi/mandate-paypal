from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel


class ReceiptRef(SdkBaseModel):
    """The signed log entry an event reports"""

    seq: Optional[int] = UNSET
    hash: Optional[str] = UNSET


class ReceiptRefDict(TypedDict):
    seq: NotRequired[int]
    hash: NotRequired[str]
