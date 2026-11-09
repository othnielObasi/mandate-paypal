from __future__ import annotations

from typing_extensions import TypedDict

from ..core import SdkBaseModel


class Check(SdkBaseModel):
    id: str
    label: str
    ok: bool
    detail: str


class CheckDict(TypedDict):
    id: str
    label: str
    ok: bool
    detail: str
