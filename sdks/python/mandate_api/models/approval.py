from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel


class Approval(SdkBaseModel):
    id: Optional[str] = UNSET
    mandate_id: Optional[str] = Field(default=UNSET, alias="mandateId")
    status: Optional[str] = UNSET
    expires_at: Optional[RFC3339DateTime] = Field(default=UNSET, alias="expiresAt")


class ApprovalDict(TypedDict):
    id: NotRequired[str]
    mandate_id: NotRequired[str]
    status: NotRequired[str]
    expires_at: NotRequired[RFC3339DateTime]
