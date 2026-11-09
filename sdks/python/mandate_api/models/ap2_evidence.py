from __future__ import annotations

from typing import Any

from pydantic import Field
from typing_extensions import NotRequired, TypedDict

from ..core import UNSET, Optional, SdkBaseModel
from .budget_context import BudgetContext, BudgetContextDict
from .enums.spec import SpecOrStr


class Ap2Evidence(SdkBaseModel):
    spec: Optional[SpecOrStr] = UNSET
    mode: Optional[str] = UNSET
    checkout_jwt: Optional[str] = Field(default=UNSET, alias="checkoutJwt")
    """Merchant-signed UCP checkout (ES256 JWT)"""

    checkout_chain: Optional[str] = Field(default=UNSET, alias="checkoutChain")
    """Checkout Mandate SD-JWT chain"""

    payment_chain: Optional[str] = Field(default=UNSET, alias="paymentChain")
    """Payment Mandate SD-JWT chain"""

    context: Optional[BudgetContext] = UNSET
    """Budget already used in the period, for the budget constraint"""

    checkout_receipt: Optional[str] = Field(default=UNSET, alias="checkoutReceipt")
    """Merchant receipt (ES256 JWT)"""

    payment_receipt: Optional[str] = Field(default=UNSET, alias="paymentReceipt")
    """Payment gateway receipt with PayPal order and capture IDs (ES256 JWT)"""

    open_checkout_hash: Optional[str] = Field(default=UNSET, alias="openCheckoutHash")
    passkey: Optional[Any] = UNSET
    """WebAuthn assertion, present when the buyer approved on their device"""


class Ap2EvidenceDict(TypedDict):
    spec: NotRequired[SpecOrStr]
    mode: NotRequired[str]
    checkout_jwt: NotRequired[str]
    checkout_chain: NotRequired[str]
    payment_chain: NotRequired[str]
    context: NotRequired[BudgetContextDict]
    checkout_receipt: NotRequired[str]
    payment_receipt: NotRequired[str]
    open_checkout_hash: NotRequired[str]
    passkey: NotRequired[Any]
