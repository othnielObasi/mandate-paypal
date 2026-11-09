from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class ChainIntact(SdkBaseModel):
    ok: bool
    """Always true for an intact chain"""

    count: int


class ChainIntactDict(TypedDict):
    ok: bool
    count: int
