from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, RFC3339DateTime, SdkBaseModel
from .ap2_verdict import Ap2Verdict, Ap2VerdictDict
from .credential_chain import CredentialChain, CredentialChainDict
from .enums.mode import ModeOrStr


class OrderDetails(SdkBaseModel):
    paypal_order_id: Optional[str] = Field(default=UNSET, alias="paypalOrderId")
    payment_mandate_id: Optional[str] = Field(default=UNSET, alias="paymentMandateId")
    mode: Optional[ModeOrStr] = UNSET
    merchant: Optional[str] = UNSET
    total: Optional[str] = UNSET
    items: Optional[list[str]] = UNSET
    created_at: Optional[RFC3339DateTime] = Field(default=UNSET, alias="createdAt")
    chain: Optional[CredentialChain] = UNSET
    """Mandate v1 credentials (Ed25519 JWS). Post them to ``/api/verify`` to re-check."""

    ap2: OptionalNullable[Ap2Verdict] = UNSET


class OrderDetailsDict(TypedDict):
    paypal_order_id: NotRequired[str]
    payment_mandate_id: NotRequired[str]
    mode: NotRequired[ModeOrStr]
    merchant: NotRequired[str]
    total: NotRequired[str]
    items: NotRequired[list[str]]
    created_at: NotRequired[RFC3339DateTime]
    chain: NotRequired[CredentialChainDict]
    ap2: NotRequired[Ap2VerdictDict | None]
