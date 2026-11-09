from __future__ import annotations

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, OptionalNullable, RFC3339DateTime, SdkBaseModel
from .check import Check, CheckDict


class SellerPayment(SdkBaseModel):
    ok: bool
    checks: list[Check]
    notes: Optional[list[str]] = UNSET
    paypal_order_id: Optional[str] = Field(default=UNSET, alias="paypalOrderId")
    payment_mandate_id: Optional[str] = Field(default=UNSET, alias="paymentMandateId")
    mode: Optional[str] = UNSET
    merchant: Optional[str] = UNSET
    total: Optional[str] = UNSET
    items: Optional[list[str]] = UNSET
    created_at: Optional[RFC3339DateTime] = Field(default=UNSET, alias="createdAt")
    ap2: OptionalNullable[bool] = UNSET
    """AP2 v0.2 verdict, null if no AP2 evidence"""


class SellerPaymentDict(TypedDict):
    ok: bool
    checks: list[CheckDict]
    notes: NotRequired[list[str]]
    paypal_order_id: NotRequired[str]
    payment_mandate_id: NotRequired[str]
    mode: NotRequired[str]
    merchant: NotRequired[str]
    total: NotRequired[str]
    items: NotRequired[list[str]]
    created_at: NotRequired[RFC3339DateTime]
    ap2: NotRequired[bool | None]
