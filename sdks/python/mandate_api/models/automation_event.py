from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, RFC3339DateTime, SdkBaseModel
from .enums.event import EventOrStr
from .enums.status import StatusOrStr
from .receipt_ref import ReceiptRef, ReceiptRefDict


class AutomationEvent(SdkBaseModel):
    """What Mandate posts to the Zapier Catch Hook. Flat, so every field maps straight into a Zap step."""

    event: EventOrStr
    message: str
    """One line for an SMS, email subject or Slack message"""

    mandate_id: str = Field(alias="mandateId")
    at: RFC3339DateTime
    link: str
    """Where to act (the app), or the payment's public verdict"""

    receipt: ReceiptRef
    """The signed log entry an event reports"""

    approval_id: Optional[str] = Field(default=UNSET, alias="approvalId")
    paypal_order_id: Optional[str] = Field(default=UNSET, alias="paypalOrderId")
    rule: Optional[str] = UNSET
    """The rule that blocked the purchase"""

    status: Optional[StatusOrStr] = UNSET


class AutomationEventDict(TypedDict):
    event: EventOrStr
    message: str
    mandate_id: str
    at: RFC3339DateTime
    link: str
    receipt: ReceiptRefDict
    approval_id: NotRequired[str]
    paypal_order_id: NotRequired[str]
    rule: NotRequired[str]
    status: NotRequired[StatusOrStr]
