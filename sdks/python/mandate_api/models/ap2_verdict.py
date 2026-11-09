from __future__ import annotations

from typing import Literal

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .ap2_evidence import Ap2Evidence, Ap2EvidenceDict
from .check import Check, CheckDict
from .enums.mode import ModeOrStr
from .merchant_ref import MerchantRef, MerchantRefDict
from .money import Money, MoneyDict


class Ap2Verdict(SdkBaseModel):
    spec: Literal["ap2/0.2"] = "ap2/0.2"
    paypal_order_id: Optional[str] = Field(default=UNSET, alias="paypalOrderId")
    ok: bool
    """Safe to fulfil only when true"""

    mode: Optional[ModeOrStr] = UNSET
    checks: list[Check]
    """checkout_signed, checkout_chain, checkout_hash, checkout_constraints, payment_chain, payment_matches_checkout,
    payment_constraints, checkout_receipt, payment_receipt, and passkey_approval when the buyer approved on their
    device."""

    amount: Optional[Money] = UNSET
    merchant: Optional[MerchantRef] = UNSET
    evidence: Ap2Evidence


class Ap2VerdictDict(TypedDict):
    spec: Literal["ap2/0.2"]
    paypal_order_id: NotRequired[str]
    ok: bool
    mode: NotRequired[ModeOrStr]
    checks: list[CheckDict]
    amount: NotRequired[MoneyDict]
    merchant: NotRequired[MerchantRefDict]
    evidence: Ap2EvidenceDict
