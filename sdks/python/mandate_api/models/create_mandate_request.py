from __future__ import annotations

from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .policy import Policy, PolicyDict


class CreateMandateRequest(SdkBaseModel):
    text: str
    """The rules in plain English"""

    policy: Optional[Policy] = UNSET
    """The signed rules. Money is in minor units (cents)."""


class CreateMandateRequestDict(TypedDict):
    text: str
    policy: NotRequired[PolicyDict]
