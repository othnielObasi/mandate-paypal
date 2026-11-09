from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .decision import Decision, DecisionDict
from .enums.status3 import Status3OrStr


class ProposeResult(SdkBaseModel):
    status: Status3OrStr
    decision: Optional[Decision] = UNSET
    paypal_order_id: Optional[str] = Field(default=UNSET, alias="paypalOrderId")
    amount_minor: Optional[int] = Field(default=UNSET, alias="amountMinor")
    payment_mandate_id: Optional[str] = Field(default=UNSET, alias="paymentMandateId")
    approval_id: Optional[str] = Field(default=UNSET, alias="approvalId")
    approve_url: Optional[str] = Field(default=UNSET, alias="approveUrl")
    """PayPal buyer approval link (sandbox mode)"""

    error: Optional[str] = UNSET


class ProposeResultDict(TypedDict):
    status: Status3OrStr
    decision: NotRequired[DecisionDict]
    paypal_order_id: NotRequired[str]
    amount_minor: NotRequired[int]
    payment_mandate_id: NotRequired[str]
    approval_id: NotRequired[str]
    approve_url: NotRequired[str]
    error: NotRequired[str]
