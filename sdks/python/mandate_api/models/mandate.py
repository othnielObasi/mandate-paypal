from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel
from .enums.status import StatusOrStr
from .policy import Policy, PolicyDict


class Mandate(SdkBaseModel):
    id: Optional[str] = UNSET
    user_id: Optional[str] = Field(default=UNSET, alias="userId")
    status: Optional[StatusOrStr] = UNSET
    raw_text: Optional[str] = Field(default=UNSET, alias="rawText")
    created_at: Optional[RFC3339DateTime] = Field(default=UNSET, alias="createdAt")
    policy: Optional[Policy] = UNSET
    """The signed rules. Money is in minor units (cents)."""


class MandateDict(TypedDict):
    id: NotRequired[str]
    user_id: NotRequired[str]
    status: NotRequired[StatusOrStr]
    raw_text: NotRequired[str]
    created_at: NotRequired[RFC3339DateTime]
    policy: NotRequired[PolicyDict]
