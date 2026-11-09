from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .check import Check, CheckDict


class ChainVerdict(SdkBaseModel):
    ok: bool
    checks: list[Check]
    notes: Optional[list[str]] = UNSET


class ChainVerdictDict(TypedDict):
    ok: bool
    checks: list[CheckDict]
    notes: NotRequired[list[str]]
