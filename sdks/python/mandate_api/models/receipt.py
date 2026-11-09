from __future__ import annotations

from typing import Any

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel


class Receipt(SdkBaseModel):
    seq: int
    mandate_id: Optional[str] = Field(default=UNSET, alias="mandateId")
    type_: str = Field(alias="type")
    summary: str
    payload: Optional[Any] = UNSET
    payload_hash: str = Field(alias="payloadHash")
    created_at: RFC3339DateTime = Field(alias="createdAt")
    prev_hash: str = Field(alias="prevHash")
    hash: str
    signature: str
    """Ed25519 over ``hash``, verify with /api/public-key"""


class ReceiptDict(TypedDict):
    seq: int
    mandate_id: NotRequired[str]
    type_: str
    summary: str
    payload: NotRequired[Any]
    payload_hash: str
    created_at: RFC3339DateTime
    prev_hash: str
    hash: str
    signature: str
