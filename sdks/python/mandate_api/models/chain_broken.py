from __future__ import annotations

from pydantic import Field
from typing_extensions import TypedDict

from ..core import SdkBaseModel
from .enums.reason import ReasonOrStr


class ChainBroken(SdkBaseModel):
    ok: bool
    """Always false for a broken chain"""

    broken_at: int = Field(alias="brokenAt")
    """seq of the first altered receipt"""

    reason: ReasonOrStr


class ChainBrokenDict(TypedDict):
    ok: bool
    broken_at: int
    reason: ReasonOrStr
